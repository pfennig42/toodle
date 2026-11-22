import { m } from '#lib/paraglide/messages.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, count, eq, inArray } from 'drizzle-orm';
import { utcToZoned } from '#lib/datetime.js';
import { COMMENT_MAX, type LegInput, type TravelInput } from '#lib/registration.js';
import { db } from '#lib/server/db/index.js';
import {
	eventOrganizer,
	registration,
	travelLeg,
	user,
	type Event
} from '#lib/server/db/schema.js';
import {
	getEventBySlug,
	listFields,
	listOrganizers,
	registrationState
} from '#lib/server/events.js';
import { addContact, listContacts, listPlaces, parseContact } from '#lib/server/profile.js';
import { parseAnswers, parseTravel } from '#lib/server/registration-rules.js';
import {
	countActiveRegistrations,
	getRegistration,
	isFull,
	saveRegistration,
	withdrawRegistration,
	type FullRegistration
} from '#lib/server/registrations.js';
import { sendConfirmation } from '#lib/server/notifications.js';
import { createSession, validateSession } from '#lib/server/auth/index.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import { guestAccount, parseGuest } from '#lib/server/guests.js';
import { recordVisit } from '#lib/server/visits.js';
import type { Actions, PageServerLoad } from './$types';

/** Registering without an account creates accounts – keep that from being automated. */
const guestsPerIp = createRateLimiter(10, 60 * 60 * 1000);

function isOrganizer(eventId: string, userId: string | undefined) {
	if (!userId) return false;
	return !!db
		.select()
		.from(eventOrganizer)
		.where(and(eq(eventOrganizer.eventId, eventId), eq(eventOrganizer.userId, userId)))
		.get();
}

function loadEvent(slug: string, userId: string | undefined) {
	const e = getEventBySlug(slug);
	if (!e) error(404);
	const organizer = isOrganizer(e.id, userId);
	// Drafts are only visible to the team (as preview).
	if (e.status === 'draft' && !organizer) error(404);
	return { e, organizer };
}

type Saved = ReturnType<typeof listPlaces>;

/** People with a car and free seats on the way there – the number that makes the idea tangible. */
function countDrivers(eventId: string) {
	return (
		db
			.select({ n: count() })
			.from(travelLeg)
			.innerJoin(registration, eq(registration.id, travelLeg.registrationId))
			.where(
				and(
					eq(registration.eventId, eventId),
					eq(registration.status, 'active'),
					eq(travelLeg.direction, 'to'),
					inArray(travelLeg.mode, ['car', 'flexible']),
					eq(travelLeg.carStatus, 'offering')
				)
			)
			.get()?.n ?? 0
	);
}

/** Turns a stored registration back into the form's input shape. */
function toTravelInput(reg: FullRegistration, e: Event, saved: Saved): TravelInput {
	const input: TravelInput = {};
	for (const leg of reg.legs) {
		const match = saved.find((p) => p.address === leg.placeAddress && p.label === leg.placeLabel);
		input[leg.direction] = {
			mode: leg.mode,
			time: leg.time
				? leg.hasClock
					? utcToZoned(leg.time, e.timezone)
					: utcToZoned(leg.time, e.timezone).slice(0, 10)
				: '',
			place: match
				? { kind: 'saved', id: match.id }
				: leg.placeAddress && leg.lat !== null && leg.lon !== null
					? {
							kind: 'custom',
							label: leg.placeLabel ?? '',
							save: false,
							point: {
								name: leg.placeLabel ?? leg.placeArea ?? '',
								address: leg.placeAddress,
								area: leg.placeArea ?? '',
								lat: leg.lat,
								lon: leg.lon
							}
						}
					: null,
			carStatus: leg.carStatus ?? 'offering',
			carNote: leg.carNote,
			pickups: leg.pickups.map((p) => ({
				// the stored label already is the public one (see publicName)
				point: {
					name: p.label,
					address: p.label,
					area: p.area,
					lat: p.lat,
					lon: p.lon,
					shareName: true
				},
				time: p.time ? utcToZoned(p.time, e.timezone) : ''
			}))
		};
	}
	return input;
}

/**
 * A fresh leg: the day prefilled from the event (arrival → first day, departure → last day).
 * The time only where it is known: leaving when the event ends; arriving is up to the guest.
 */
function defaultLeg(e: Event, saved: Saved, direction: 'to' | 'from'): LegInput {
	const startDay = utcToZoned(e.startsAt, e.timezone).slice(0, 10);
	const end = utcToZoned(e.endsAt, e.timezone);
	return {
		mode: null,
		time: direction === 'to' ? startDay : e.endHasTime ? end : end.slice(0, 10),
		// no saved places yet: straight to the address search
		place: saved[0]
			? { kind: 'saved', id: saved[0].id }
			: { kind: 'custom', label: m.place_default_home(), point: null, save: true },
		carStatus: 'offering',
		carNote: '',
		pickups: []
	};
}

export const load: PageServerLoad = ({ params, locals, url }) => {
	const me = locals.user;
	const { e, organizer } = loadEvent(params.slug, me?.id);
	const fields = listFields(e.id).map(({ id, type, label, help, required, config }) => ({
		id,
		type,
		label,
		help,
		required,
		config
	}));
	const state = registrationState(e);
	const saved = me ? listPlaces(me.id) : [];
	const reg = me ? getRegistration(e.id, me.id) : null;
	// not registered yet: the start page offers to finish it later (e.g. after a detour)
	if (me && !organizer && !reg && state === 'open') recordVisit(me.id, e.id);
	const travelInput = reg ? toTravelInput(reg, e, saved) : {};
	for (const dir of ['to', 'from'] as const) travelInput[dir] ??= defaultLeg(e, saved, dir);

	return {
		event: {
			id: e.id,
			slug: e.slug,
			title: e.title,
			description: e.description,
			locationName: e.locationName,
			locationArea: e.locationArea,
			locationAddress: e.locationAddress,
			lat: e.lat,
			lon: e.lon,
			startsAt: e.startsAt,
			endsAt: e.endsAt,
			timezone: e.timezone,
			registrationDeadline: e.registrationDeadline,
			startHasTime: e.startHasTime,
			endHasTime: e.endHasTime,
			deadlineHasTime: e.deadlineHasTime,
			capacity: e.capacity,
			rideVisibility: e.rideVisibility,
			state
		},
		fields,
		// display names of the team: a face to the invitation, no e-mail addresses
		hosts: listOrganizers(e.id)
			.map((o) => o.name?.trim())
			.filter((n): n is string => !!n),
		going: countActiveRegistrations(e.id),
		drivers: countDrivers(e.id),
		isOrganizer: organizer,
		loggedIn: !!me,
		full: me
			? isFull(e, me.id)
			: e.capacity !== null && countActiveRegistrations(e.id) >= e.capacity,
		// guests are asked for a contact option in the form, like accounts without one
		hasContact: me ? listContacts(me.id).length > 0 : false,
		/** shown (read-only) next to name and e-mail in the form */
		contacts: me
			? listContacts(me.id).map(({ kind, value, label }) => ({ kind, value, label }))
			: [],
		/** "Continue without logging in" – the form with name and e-mail at its end */
		guest: !me && url.searchParams.has('guest'),
		// own places only – with coordinates for the map
		savedPlaces: saved.map(({ id, label, area, lat, lon }) => ({ id, label, area, lat, lon })),
		registration: reg && {
			status: reg.status,
			comment: reg.comment,
			answers: reg.answers,
			legs: reg.legs.map((l) => ({
				direction: l.direction,
				mode: l.mode,
				time: l.time,
				hasClock: l.hasClock,
				placeLabel: l.placeLabel,
				placeArea: l.placeArea,
				carStatus: l.carStatus,
				carNote: l.carNote,
				pickups: l.pickups.map((p) => ({ label: p.label, area: p.area, time: p.time }))
			}))
		},
		travelInput
	};
};

export const actions: Actions = {
	register: async ({ params, locals, request, cookies, getClientAddress }) => {
		const me = locals.user;
		const { e } = loadEvent(params.slug, me?.id);
		const form = await request.formData();

		// Not logged in: a guest, who gives name and e-mail at the end of the form.
		const guest = me ? null : parseGuest(form);
		const guestBack = guest && { guestName: guest.name, guestEmail: guest.email };
		if (guest && !guestsPerIp.take(getClientAddress()))
			return fail(429, { error: 'rate' as const, ...guestBack });
		// a known address: its account – but this device is not logged in (see guestAccount)
		const knownId =
			guest?.ok &&
			db.select({ id: user.id }).from(user).where(eq(user.email, guest.email)).get()?.id;
		const userId = me?.id ?? (knownId || undefined);

		const state = registrationState(e);
		const existing = userId ? getRegistration(e.id, userId) : null;
		const isActive = existing?.status === 'active';
		// Somebody typing an address must not be able to change that person's registration –
		// nor bring back one they withdrew.
		if (guest && existing) return fail(400, { error: 'guest_taken' as const, ...guestBack });

		// New registrations only while open; existing ones may update travel details until the end.
		const canRegister = state === 'open' && (isActive || !isFull(e, userId ?? ''));
		const canUpdateTravel =
			isActive && (state === 'open' || state === 'deadline' || state === 'closed');
		if (!canRegister && !canUpdateTravel) return fail(400, { error: 'closed' as const });
		const answersEditable = canRegister;

		const fields = listFields(e.id);
		const comment = String(form.get('comment') ?? '')
			.trim()
			.slice(0, COMMENT_MAX);

		const answers = answersEditable ? parseAnswers(fields, form) : null;
		const travelField = fields.find((f) => f.type === 'travel');
		let travelRaw: unknown = {};
		try {
			travelRaw = JSON.parse(String(form.get('travel') ?? '{}'));
		} catch {
			/* treated as empty */
		}
		const travel = travelField
			? parseTravel(travelRaw, {
					directions: travelField.config.directions ?? ['to', 'from'],
					required: travelField.required,
					timezone: e.timezone,
					savedPlaces: me ? listPlaces(me.id) : []
				})
			: { ok: true as const, legs: [], placesToSave: [] };

		// optional contact option, asked in the form when the person has none yet
		const contactValue = String(form.get('value') ?? '').trim();
		const contact = contactValue ? parseContact(form) : null;
		const contactError = !!contactValue && !contact;

		if ((answers && !answers.ok) || !travel.ok || contactError || (guest && !guest.ok)) {
			return fail(400, {
				error: 'invalid' as const,
				answerErrors: answers && !answers.ok ? answers.errors : {},
				travelErrors: !travel.ok ? travel.errors : {},
				contactError,
				guestErrors: guest && !guest.ok ? guest.errors : {},
				...guestBack
			});
		}

		let uid: string;
		let ownsAccount = !!me; // may add places and contacts to the profile
		if (guest?.ok) {
			const account = guestAccount(guest.name, guest.email, locals.locale);
			uid = account.userId;
			ownsAccount = account.created;
		} else uid = me!.id;

		saveRegistration({
			eventId: e.id,
			userId: uid,
			comment,
			answers: answers?.ok ? answers.answers : null,
			legs: travel.legs,
			placesToSave: ownsAccount ? travel.placesToSave : []
		});
		if (ownsAccount && contact && listContacts(uid).length === 0) addContact(uid, contact);
		// Confirmation only for new (or renewed) registrations, not for every edit. Guests always
		// get it: it's their only receipt – and tells account owners if somebody used their address.
		if (!isActive) void sendConfirmation(e.id, uid, { guest: !!guest });

		if (guest?.ok) {
			if (!ownsAccount) return { guestSaved: true, sentTo: guest.email };
			// the new silent account: this device stays logged in (also for the page rendered now)
			createSession(uid, cookies);
			locals.user = validateSession(cookies);
			return { saved: true, wasRegistered: false, sentTo: guest.email };
		}
		return { saved: true, wasRegistered: isActive };
	},

	withdraw: ({ params, locals }) => {
		const me = locals.user;
		if (!me) redirect(303, `/login?next=/e/${params.slug}`);
		const { e } = loadEvent(params.slug, me.id);
		if (registrationState(e) === 'past') return fail(400, { error: 'closed' as const });
		withdrawRegistration(e.id, me.id);
		return { withdrawn: true };
	}
};
