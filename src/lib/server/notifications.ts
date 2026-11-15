/**
 * Mail notifications (docs/konzept.md 4.7): registration confirmation, ride hints, ride links
 * set by someone else and reminders for open travel plans. Every kind can be switched off.
 */
import { randomBytes } from 'node:crypto';
import { and, eq, gt, inArray, isNotNull, max } from 'drizzle-orm';
import { NOTIFY_INTERVAL, ORIGIN } from '$app/env/private';
import { m } from '../paraglide/messages.js';
import { formatRange } from '../datetime.js';
import type { TravelDirection } from '../forms.js';
import { modeLabel, shortTime } from '../travel-summary.js';
import { db } from './db/index.js';
import {
	event,
	formField,
	notification,
	registration,
	travelLeg,
	user,
	type Event,
	type NotificationKind
} from './db/schema.js';
import { eventIcs } from './ics.js';
import { withLocale } from './locale-context.js';
import { renderMail, trySendMail } from './mail.js';
import {
	groupNotices,
	matchRef,
	openDirections,
	rideMatchNotices,
	travelReminderDue,
	type MatchNotice
} from './notify-rules.js';
import { loadRideData } from './rides.js';

export const PREF_KINDS = ['confirmation', 'rides', 'reminders'] as const;
export type PrefKind = (typeof PREF_KINDS)[number];

const PREF_COLUMN = {
	confirmation: 'notifyConfirmation',
	rides: 'notifyRides',
	reminders: 'notifyReminders'
} as const;

type Recipient = typeof user.$inferSelect;

/* ----------------------------------------------------------------- helpers */

function getUser(id: string): Recipient | null {
	return db.select().from(user).where(eq(user.id, id)).get() ?? null;
}

const displayName = (u: { name: string | null; email: string }) => u.name ?? u.email.split('@')[0];

function unsubscribeToken(u: Recipient): string {
	if (u.unsubscribeToken) return u.unsubscribeToken;
	const token = randomBytes(24).toString('base64url');
	db.update(user).set({ unsubscribeToken: token }).where(eq(user.id, u.id)).run();
	return token;
}

const unsubscribeUrl = (u: Recipient, kind: PrefKind) =>
	`${ORIGIN}/unsubscribe/${unsubscribeToken(u)}?k=${kind}`;

export function setPreference(userId: string, kind: PrefKind, on: boolean) {
	db.update(user)
		.set({ [PREF_COLUMN[kind]]: on })
		.where(eq(user.id, userId))
		.run();
}

export function userByUnsubscribeToken(token: string) {
	return db.select().from(user).where(eq(user.unsubscribeToken, token)).get() ?? null;
}

/** Records a notification; false if it already exists (→ don't send twice). */
function record(
	userId: string,
	eventId: string,
	kind: NotificationKind,
	ref: string,
	sent: boolean
): boolean {
	const res = db
		.insert(notification)
		.values({ userId, eventId, kind, ref, sentAt: sent ? new Date() : null })
		.onConflictDoNothing()
		.run();
	return res.changes > 0;
}

const eventUrl = (e: Event) => `${ORIGIN}/e/${e.slug}`;
const ridesUrl = (e: Event, dir?: TravelDirection) =>
	`${ORIGIN}/e/${e.slug}/rides${dir ? `?dir=${dir}` : ''}`;
const dirLabel = (d: TravelDirection) => (d === 'to' ? m.travel_to() : m.travel_from());

function travelDirections(eventId: string): TravelDirection[] {
	const f = db
		.select()
		.from(formField)
		.where(and(eq(formField.eventId, eventId), eq(formField.type, 'travel')))
		.get();
	return f?.config.directions ?? [];
}

function eventPoint(e: Event) {
	return e.lat !== null && e.lon !== null ? { lat: e.lat, lon: e.lon } : null;
}

function matchLine(n: MatchNotice): string {
	const vars = {
		direction: dirLabel(n.direction),
		name: n.other.name,
		place: n.other.place ? ` (${n.other.place})` : '',
		min: n.other.detourMin
	};
	// a couple of minutes is noise in a straight-line estimate – call it "on the way"
	const onTheWay = n.other.detourMin <= 2;
	if (n.role === 'seeker')
		return onTheWay ? m.mail_match_driver_line_way(vars) : m.mail_match_driver_line(vars);
	return onTheWay ? m.mail_match_seeker_line_way(vars) : m.mail_match_seeker_line(vars);
}

/** Current matches for one person (used in the confirmation mail). */
function matchesFor(e: Event, registrationId: string, now = new Date()) {
	const point = eventPoint(e);
	if (!point) return [];
	const { participants, links } = loadRideData(e.id);
	const dirs = openDirections(travelDirections(e.id), e, now);
	return rideMatchNotices(participants, links, point, dirs).filter(
		(n) => n.registrationId === registrationId
	);
}

/* ------------------------------------------------------------ confirmation */

/** After a new registration (or re-registration). Never throws. */
export async function sendConfirmation(eventId: string, userId: string) {
	try {
		const e = db.select().from(event).where(eq(event.id, eventId)).get();
		const u = getUser(userId);
		const reg = db
			.select()
			.from(registration)
			.where(and(eq(registration.eventId, eventId), eq(registration.userId, userId)))
			.get();
		if (!e || !u || !reg) return;

		// Matches that exist now are shown in this mail – no separate hint mail for them later.
		const matches = matchesFor(e, reg.id);
		for (const n of matches) record(u.id, e.id, 'ride_match', matchRef(n), false);
		if (!u.notifyConfirmation) return;
		record(u.id, e.id, 'confirmation', `${reg.id}:${Date.now()}`, true);

		const legs = db.select().from(travelLeg).where(eq(travelLeg.registrationId, reg.id)).all();
		const hasTravel = travelDirections(e.id).length > 0;

		const mail = withLocale(u.locale, () => {
			const locale = u.locale ?? 'de';
			const where = [e.locationName, e.locationArea].filter(Boolean).join(', ');
			const travelLines = legs
				.sort((a, b) => (a.direction === b.direction ? 0 : a.direction === 'to' ? -1 : 1))
				.map((l) =>
					[
						`${dirLabel(l.direction)}: ${modeLabel(l.mode)}`,
						l.placeArea ?? l.placeLabel,
						l.time ? shortTime(l.time, e.timezone, locale) : null
					]
						.filter(Boolean)
						.join(' · ')
				);
			const after: string[] = [];
			if (matches.length) {
				after.push(
					matches.some((n) => n.role === 'seeker')
						? m.mail_confirm_matches_seeker({ count: matches.length })
						: m.mail_confirm_matches_driver({ count: matches.length })
				);
				after.push(...matches.slice(0, 5).map((n) => `• ${matchLine(n)}`));
			}
			return {
				to: u.email,
				subject: m.mail_confirm_subject({ title: e.title }),
				...renderMail({
					paragraphs: [
						m.mail_hello({ name: displayName(u) }),
						m.mail_confirm_intro({ title: e.title }),
						[formatRange(e.startsAt, e.endsAt, e.timezone, locale), where]
							.filter(Boolean)
							.join(' · ')
					],
					items: travelLines,
					after,
					action: hasTravel
						? { label: m.mail_button_rides(), url: ridesUrl(e) }
						: { label: m.mail_button_event(), url: eventUrl(e) },
					footer: m.mail_confirm_footer(),
					unsubscribe: {
						label: m.mail_unsubscribe_confirmation(),
						url: unsubscribeUrl(u, 'confirmation')
					}
				}),
				unsubscribeUrl: unsubscribeUrl(u, 'confirmation'),
				attachments: [
					{
						filename: 'event.ics',
						contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
						content: eventIcs({
							id: e.id,
							title: e.title,
							startsAt: e.startsAt,
							endsAt: e.endsAt,
							location: [e.locationName, e.locationAddress].filter(Boolean).join(', '),
							url: eventUrl(e),
							description: ''
						})
					}
				]
			};
		});
		await trySendMail(mail);
	} catch (err) {
		console.error('[notify] confirmation failed', err);
	}
}

/* --------------------------------------------------------------- ride links */

/**
 * Someone connected a ride. Tell the people involved who didn't do it themselves
 * ("Olga has put you down as riding with Anna"). Only once per pair and direction.
 */
export async function notifyRideLink(
	eventId: string,
	direction: TravelDirection,
	driverRegistrationId: string,
	passengerRegistrationId: string,
	actorUserId: string
) {
	try {
		const e = db.select().from(event).where(eq(event.id, eventId)).get();
		if (!e) return;
		const regs = db
			.select({ id: registration.id, user })
			.from(registration)
			.innerJoin(user, eq(user.id, registration.userId))
			.where(inArray(registration.id, [driverRegistrationId, passengerRegistrationId]))
			.all();
		const driver = regs.find((r) => r.id === driverRegistrationId)?.user;
		const passenger = regs.find((r) => r.id === passengerRegistrationId)?.user;
		const actor = getUser(actorUserId);
		if (!driver || !passenger || !actor) return;
		const ref = `${direction}:${driverRegistrationId}:${passengerRegistrationId}`;

		for (const [recipient, other, isDriver] of [
			[driver, passenger, true],
			[passenger, driver, false]
		] as const) {
			if (recipient.id === actor.id) continue;
			if (!record(recipient.id, e.id, 'ride_link', ref, recipient.notifyRides)) continue;
			if (!recipient.notifyRides) continue;
			const byOrga = actor.id !== other.id;
			const mail = withLocale(recipient.locale, () => {
				const vars = {
					name: displayName(other),
					title: e.title,
					direction: dirLabel(direction),
					actor: displayName(actor)
				};
				return {
					to: recipient.email,
					subject: isDriver
						? m.mail_link_driver_subject(vars)
						: m.mail_link_passenger_subject(vars),
					...renderMail({
						paragraphs: [
							m.mail_hello({ name: displayName(recipient) }),
							isDriver ? m.mail_link_driver_text(vars) : m.mail_link_passenger_text(vars),
							...(byOrga ? [m.mail_link_by({ actor: vars.actor })] : []),
							m.mail_link_hint()
						],
						action: { label: m.mail_button_rides(), url: ridesUrl(e, direction) },
						footer: m.mail_rides_footer(),
						unsubscribe: {
							label: m.mail_unsubscribe_rides(),
							url: unsubscribeUrl(recipient, 'rides')
						}
					}),
					unsubscribeUrl: unsubscribeUrl(recipient, 'rides')
				};
			});
			await trySendMail(mail);
		}
	} catch (err) {
		console.error('[notify] ride link failed', err);
	}
}

/* --------------------------------------------------------------- the job */

async function rideMatchMails(e: Event, now: Date) {
	const point = eventPoint(e);
	const dirs = openDirections(travelDirections(e.id), e, now);
	if (!point || !dirs.length) return 0;
	const { participants, links } = loadRideData(e.id);
	const notices = rideMatchNotices(participants, links, point, dirs);
	if (!notices.length) return 0;

	const rows = db
		.select({ userId: notification.userId, ref: notification.ref })
		.from(notification)
		.where(and(eq(notification.eventId, e.id), eq(notification.kind, 'ride_match')))
		.all();
	const known = new Set(rows.map((r) => `${r.userId}|${r.ref}`));
	const last = db
		.select({ userId: notification.userId, at: max(notification.sentAt) })
		.from(notification)
		.where(
			and(
				eq(notification.eventId, e.id),
				eq(notification.kind, 'ride_match'),
				isNotNull(notification.sentAt)
			)
		)
		.groupBy(notification.userId)
		.all();
	const lastMailAt = new Map(last.filter((l) => l.at).map((l) => [l.userId, l.at as Date]));

	let sent = 0;
	for (const [userId, list] of groupNotices(notices, known, lastMailAt, now)) {
		const u = getUser(userId);
		if (!u) continue;
		for (const n of list) record(u.id, e.id, 'ride_match', matchRef(n), u.notifyRides);
		if (!u.notifyRides) continue;
		const seeking = list.some((n) => n.role === 'seeker');
		const mail = withLocale(u.locale, () => ({
			to: u.email,
			subject: seeking
				? m.mail_match_subject_seeker({ title: e.title })
				: m.mail_match_subject_driver({ title: e.title }),
			...renderMail({
				paragraphs: [
					m.mail_hello({ name: displayName(u) }),
					seeking
						? m.mail_match_intro_seeker({ title: e.title })
						: m.mail_match_intro_driver({ title: e.title })
				],
				items: list.slice(0, 10).map(matchLine),
				after: [m.mail_match_hint()],
				action: { label: m.mail_button_rides(), url: ridesUrl(e, list[0].direction) },
				footer: m.mail_rides_footer(),
				unsubscribe: { label: m.mail_unsubscribe_rides(), url: unsubscribeUrl(u, 'rides') }
			}),
			unsubscribeUrl: unsubscribeUrl(u, 'rides')
		}));
		if (await trySendMail(mail)) sent++;
	}
	return sent;
}

async function travelReminders(e: Event, now: Date) {
	const dirs = travelDirections(e.id);
	if (!dirs.length) return 0;
	const regs = db
		.select({ reg: registration, user })
		.from(registration)
		.innerJoin(user, eq(user.id, registration.userId))
		.where(and(eq(registration.eventId, e.id), eq(registration.status, 'active')))
		.all();
	if (!regs.length) return 0;
	const legs = db
		.select()
		.from(travelLeg)
		.where(
			inArray(
				travelLeg.registrationId,
				regs.map((r) => r.reg.id)
			)
		)
		.all();
	const drivers = legs.filter((l) => l.mode === 'car').length;

	let sent = 0;
	for (const { reg, user: u } of regs) {
		const mine = Object.fromEntries(
			legs.filter((l) => l.registrationId === reg.id).map((l) => [l.direction, l])
		);
		if (!travelReminderDue(e, { updatedAt: reg.updatedAt, legs: mine }, dirs, now)) continue;
		if (!record(u.id, e.id, 'travel_reminder', reg.id, u.notifyReminders)) continue;
		if (!u.notifyReminders) continue;
		const mail = withLocale(u.locale, () => ({
			to: u.email,
			subject: m.mail_reminder_subject({ title: e.title }),
			...renderMail({
				paragraphs: [
					m.mail_hello({ name: displayName(u) }),
					m.mail_reminder_text({ title: e.title }),
					...(drivers ? [m.mail_reminder_drivers({ count: drivers })] : [])
				],
				action: { label: m.mail_reminder_button(), url: eventUrl(e) },
				footer: m.mail_reminder_footer(),
				unsubscribe: {
					label: m.mail_unsubscribe_reminders(),
					url: unsubscribeUrl(u, 'reminders')
				}
			}),
			unsubscribeUrl: unsubscribeUrl(u, 'reminders')
		}));
		if (await trySendMail(mail)) sent++;
	}
	return sent;
}

/** One pass over all upcoming published events. */
export async function runNotificationJob(now = new Date()) {
	const events = db
		.select()
		.from(event)
		.where(and(eq(event.status, 'published'), gt(event.endsAt, now)))
		.all();
	let sent = 0;
	for (const e of events) {
		try {
			sent += await rideMatchMails(e, now);
			sent += await travelReminders(e, now);
		} catch (err) {
			console.error(`[notify] job failed for event ${e.id}`, err);
		}
	}
	return sent;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startNotificationJob() {
	if (timer || !(NOTIFY_INTERVAL > 0)) return;
	let running = false;
	timer = setInterval(async () => {
		if (running) return;
		running = true;
		try {
			await runNotificationJob();
		} finally {
			running = false;
		}
	}, NOTIFY_INTERVAL * 1000);
	timer.unref();
}
