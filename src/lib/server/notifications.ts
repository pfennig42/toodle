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
import { renderMail, trySendMail, type Mail } from './mail.js';
import { sendPush, type PushMessage } from './push.js';
import {
	groupNotices,
	matchRef,
	openDirections,
	rideMatchNotices,
	travelReminderDue,
	type MatchNotice
} from './notify-rules.js';
import { loadRideData } from './rides.js';
import { rideTravelTime } from './routing.js';

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
async function matchesFor(e: Event, registrationId: string, now = new Date()) {
	const point = eventPoint(e);
	// Internal rides: only the organizers match people, participants see no one else.
	if (!point || e.rideVisibility === 'internal') return [];
	const { participants, links } = loadRideData(e.id);
	const dirs = openDirections(travelDirections(e.id), e, now);
	const travel = await rideTravelTime(participants, point);
	return rideMatchNotices(participants, links, point, dirs, travel).filter(
		(n) => n.registrationId === registrationId
	);
}

/**
 * Hints and reminders: push to the user's devices if there are any, by mail otherwise
 * (or in addition, if the user wants both). True when something reached the user.
 */
async function deliver(u: Recipient, mail: Mail, push: PushMessage): Promise<boolean> {
	let pushed = 0;
	try {
		pushed = await sendPush(u.id, push);
	} catch (err) {
		console.error('[notify] push failed', err);
	}
	if (pushed > 0 && !u.mailWithPush) return true;
	return (await trySendMail(mail)) || pushed > 0;
}

/**
 * Answers to event mails go to the organizers (Reply-To) – people just hit "reply".
 * The footer says so; for ride mails it points to the ride view for talking to each other.
 */
function orgaReply(e: Event, footer: string, rides = false) {
	if (!e.contactEmail) return { footer, replyTo: undefined };
	return {
		footer: `${footer} ${rides ? m.mail_reply_rides() : m.mail_reply_orga()}`,
		replyTo: e.contactEmail
	};
}

const path = (url: string) => url.slice(ORIGIN.length) || '/';

/** Calendar entry – the same UID every time, so calendars update an entry made earlier. */
function icsAttachment(e: Event) {
	return {
		filename: 'event.ics',
		contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
		content: eventIcs({
			id: e.id,
			title: e.title,
			startsAt: e.startsAt,
			endsAt: e.endsAt,
			location: [e.locationName, e.locationAddress].filter(Boolean).join(', '),
			url: eventUrl(e),
			description: '',
			allDay: !e.startHasTime && !e.endHasTime,
			timezone: e.timezone
		})
	};
}

/** Everybody actively registered for an event. */
function registeredUsers(eventId: string): Recipient[] {
	return db
		.select({ user })
		.from(registration)
		.innerJoin(user, eq(user.id, registration.userId))
		.where(and(eq(registration.eventId, eventId), eq(registration.status, 'active')))
		.all()
		.map((r) => r.user);
}

/** Only upcoming, published events concern anybody. */
const concernsParticipants = (e: Event, now = new Date()) =>
	e.status === 'published' && e.endsAt > now;

const whereText = (e: Event) => [e.locationName, e.locationArea].filter(Boolean).join(', ');

/* ---------------------------------------------------- changes & cancellation */

/**
 * The organizers changed date or place of a published event: everybody registered hears about
 * it (whatever their mail settings – it's about the event itself), with the updated calendar
 * entry. `travelMoved`: travel plans were moved to the new days. Never throws.
 */
export async function notifyEventChanged(
	eventId: string,
	change: { when: boolean; where: boolean; travelMoved: boolean }
) {
	try {
		const e = db.select().from(event).where(eq(event.id, eventId)).get();
		if (!e || !concernsParticipants(e) || (!change.when && !change.where)) return;
		for (const u of registeredUsers(e.id)) {
			const mail = withLocale(u.locale, () => {
				const locale = u.locale ?? 'de';
				const reply = orgaReply(e, m.mail_changed_footer());
				return {
					to: u.email,
					replyTo: reply.replyTo,
					subject: m.mail_changed_subject({ title: e.title }),
					...renderMail({
						paragraphs: [
							m.mail_hello({ name: displayName(u) }),
							m.mail_changed_intro({ title: e.title })
						],
						items: [
							...(change.when
								? [
										m.mail_changed_when({
											when: formatRange(e.startsAt, e.endsAt, e.timezone, locale, e)
										})
									]
								: []),
							...(change.where && whereText(e)
								? [m.mail_changed_where({ where: whereText(e) })]
								: [])
						],
						after: change.travelMoved ? [m.mail_changed_travel()] : [],
						action: { label: m.mail_button_event(), url: eventUrl(e) },
						footer: reply.footer
					}),
					attachments: [icsAttachment(e)]
				} satisfies Mail;
			});
			await trySendMail(mail);
		}
	} catch (err) {
		console.error('[notify] event change failed', err);
	}
}

/**
 * Cancellation mails for everybody registered – built BEFORE the event is deleted (afterwards
 * nothing is left to build them from), sent after with `sendAll`.
 */
export function cancellationMails(eventId: string): Mail[] {
	const e = db.select().from(event).where(eq(event.id, eventId)).get();
	if (!e || !concernsParticipants(e)) return [];
	return registeredUsers(e.id).map((u) =>
		withLocale(u.locale, () => {
			const locale = u.locale ?? 'de';
			const reply = orgaReply(e, m.mail_cancelled_footer());
			return {
				to: u.email,
				replyTo: reply.replyTo,
				subject: m.mail_cancelled_subject({ title: e.title }),
				...renderMail({
					paragraphs: [
						m.mail_hello({ name: displayName(u) }),
						m.mail_cancelled_text({
							title: e.title,
							when: formatRange(e.startsAt, e.endsAt, e.timezone, locale, e)
						})
					],
					footer: reply.footer
				})
			};
		})
	);
}

/** Sends prepared mails one after another. Never throws. */
export async function sendAll(mails: Mail[]) {
	for (const mail of mails) await trySendMail(mail);
}

/* ------------------------------------------------------------ confirmation */

/** After a new registration (or re-registration). Never throws. */
/**
 * `guest`: registered without logging in. The mail is their only receipt, so it goes out even
 * when confirmations are switched off – it also tells account owners that their address was used.
 */
export async function sendConfirmation(
	eventId: string,
	userId: string,
	{ guest = false }: { guest?: boolean } = {}
) {
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
		const matches = await matchesFor(e, reg.id);
		for (const n of matches) record(u.id, e.id, 'ride_match', matchRef(n), false);
		if (!u.notifyConfirmation && !guest) return;
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
						l.time ? shortTime(l.time, e.timezone, locale, l.hasClock) : null
					]
						.filter(Boolean)
						.join(' · ')
				);
			const after: string[] = [];
			if (guest) after.push(m.mail_confirm_guest_hint());
			if (matches.length) {
				after.push(
					matches.some((n) => n.role === 'seeker')
						? m.mail_confirm_matches_seeker({ count: matches.length })
						: m.mail_confirm_matches_driver({ count: matches.length })
				);
				after.push(...matches.slice(0, 5).map((n) => `• ${matchLine(n)}`));
			}
			const reply = orgaReply(e, m.mail_confirm_footer());
			return {
				to: u.email,
				replyTo: reply.replyTo,
				subject: m.mail_confirm_subject({ title: e.title }),
				...renderMail({
					paragraphs: [
						m.mail_hello({ name: displayName(u) }),
						m.mail_confirm_intro({ title: e.title }),
						[formatRange(e.startsAt, e.endsAt, e.timezone, locale, e), where]
							.filter(Boolean)
							.join(' · ')
					],
					items: travelLines,
					after,
					action: hasTravel
						? { label: m.mail_button_rides(), url: ridesUrl(e) }
						: { label: m.mail_button_event(), url: eventUrl(e) },
					footer: reply.footer,
					unsubscribe: {
						label: m.mail_unsubscribe_confirmation(),
						url: unsubscribeUrl(u, 'confirmation')
					}
				}),
				unsubscribeUrl: unsubscribeUrl(u, 'confirmation'),
				attachments: [icsAttachment(e)]
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
			const { mail, push } = withLocale(recipient.locale, () => {
				const vars = {
					name: displayName(other),
					title: e.title,
					direction: dirLabel(direction),
					actor: displayName(actor)
				};
				const subject = isDriver
					? m.mail_link_driver_subject(vars)
					: m.mail_link_passenger_subject(vars);
				const reply = orgaReply(e, m.mail_rides_footer(), true);
				const mail: Mail = {
					to: recipient.email,
					replyTo: reply.replyTo,
					subject,
					...renderMail({
						paragraphs: [
							m.mail_hello({ name: displayName(recipient) }),
							isDriver ? m.mail_link_driver_text(vars) : m.mail_link_passenger_text(vars),
							...(byOrga ? [m.mail_link_by({ actor: vars.actor })] : []),
							m.mail_link_hint()
						],
						action: { label: m.mail_button_rides(), url: ridesUrl(e, direction) },
						footer: reply.footer,
						unsubscribe: {
							label: m.mail_unsubscribe_rides(),
							url: unsubscribeUrl(recipient, 'rides')
						}
					}),
					unsubscribeUrl: unsubscribeUrl(recipient, 'rides')
				};
				const push: PushMessage = {
					title: subject,
					body: [
						isDriver ? m.mail_link_driver_text(vars) : m.mail_link_passenger_text(vars),
						byOrga ? m.mail_link_by({ actor: vars.actor }) : ''
					]
						.filter(Boolean)
						.join(' '),
					url: path(ridesUrl(e, direction)),
					tag: `link-${e.id}-${direction}`
				};
				return { mail, push };
			});
			await deliver(recipient, mail, push);
		}
	} catch (err) {
		console.error('[notify] ride link failed', err);
	}
}

/* --------------------------------------------------------------- the job */

async function rideMatchMails(e: Event, now: Date) {
	const point = eventPoint(e);
	const dirs = openDirections(travelDirections(e.id), e, now);
	if (!point || !dirs.length || e.rideVisibility === 'internal') return 0;
	const { participants, links } = loadRideData(e.id);
	const travel = await rideTravelTime(participants, point);
	const notices = rideMatchNotices(participants, links, point, dirs, travel);
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
		const { mail, push } = withLocale(u.locale, () => {
			const subject = seeking
				? m.mail_match_subject_seeker({ title: e.title })
				: m.mail_match_subject_driver({ title: e.title });
			const reply = orgaReply(e, m.mail_rides_footer(), true);
			const mail: Mail = {
				to: u.email,
				replyTo: reply.replyTo,
				subject,
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
					footer: reply.footer,
					unsubscribe: { label: m.mail_unsubscribe_rides(), url: unsubscribeUrl(u, 'rides') }
				}),
				unsubscribeUrl: unsubscribeUrl(u, 'rides')
			};
			const push: PushMessage = {
				title: subject,
				body: list.slice(0, 3).map(matchLine).join('\n'),
				url: path(ridesUrl(e, list[0].direction)),
				tag: `match-${e.id}`
			};
			return { mail, push };
		});
		if (await deliver(u, mail, push)) sent++;
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
	// people (not legs) who take others along in at least one direction
	const drivers = new Set(
		legs
			.filter((l) => (l.mode === 'car' || l.mode === 'flexible') && l.carStatus === 'offering')
			.map((l) => l.registrationId)
	).size;

	let sent = 0;
	for (const { reg, user: u } of regs) {
		const mine = Object.fromEntries(
			legs.filter((l) => l.registrationId === reg.id).map((l) => [l.direction, l])
		);
		if (!travelReminderDue(e, { updatedAt: reg.updatedAt, legs: mine }, dirs, now)) continue;
		if (!record(u.id, e.id, 'travel_reminder', reg.id, u.notifyReminders)) continue;
		if (!u.notifyReminders) continue;
		const { mail, push } = withLocale(u.locale, () => {
			const subject = m.mail_reminder_subject({ title: e.title });
			const reply = orgaReply(e, m.mail_reminder_footer());
			const mail: Mail = {
				to: u.email,
				replyTo: reply.replyTo,
				subject,
				...renderMail({
					paragraphs: [
						m.mail_hello({ name: displayName(u) }),
						m.mail_reminder_text({ title: e.title }),
						...(drivers ? [m.mail_reminder_drivers({ count: drivers })] : [])
					],
					action: { label: m.mail_reminder_button(), url: eventUrl(e) },
					footer: reply.footer,
					unsubscribe: {
						label: m.mail_unsubscribe_reminders(),
						url: unsubscribeUrl(u, 'reminders')
					}
				}),
				unsubscribeUrl: unsubscribeUrl(u, 'reminders')
			};
			const push: PushMessage = {
				title: subject,
				body: m.push_reminder_body(),
				url: path(eventUrl(e)),
				tag: `reminder-${e.id}`
			};
			return { mail, push };
		});
		if (await deliver(u, mail, push)) sent++;
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
