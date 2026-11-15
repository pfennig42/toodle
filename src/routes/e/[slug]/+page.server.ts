import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { utcToZoned } from '#lib/datetime.js';
import { COMMENT_MAX, type LegInput, type TravelInput } from '#lib/registration.js';
import { db } from '#lib/server/db/index.js';
import { eventOrganizer, type Event } from '#lib/server/db/schema.js';
import { getEventBySlug, listFields, registrationState } from '#lib/server/events.js';
import { listContacts, listPlaces } from '#lib/server/profile.js';
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
import type { Actions, PageServerLoad } from './$types';

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

/** Turns a stored registration back into the form's input shape. */
function toTravelInput(reg: FullRegistration, e: Event, saved: Saved): TravelInput {
	const input: TravelInput = {};
	for (const leg of reg.legs) {
		const match = saved.find((p) => p.address === leg.placeAddress && p.label === leg.placeLabel);
		input[leg.direction] = {
			mode: leg.mode,
			time: leg.time ? utcToZoned(leg.time, e.timezone) : '',
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
				point: { name: p.label, address: p.label, area: p.area, lat: p.lat, lon: p.lon },
				time: p.time ? utcToZoned(p.time, e.timezone) : ''
			}))
		};
	}
	return input;
}

function defaultLeg(e: Event, saved: Saved, direction: 'to' | 'from'): LegInput {
	return {
		mode: null,
		time: direction === 'from' ? utcToZoned(e.endsAt, e.timezone) : '',
		place: saved[0] ? { kind: 'saved', id: saved[0].id } : null,
		carStatus: 'offering',
		carNote: '',
		pickups: []
	};
}

export const load: PageServerLoad = ({ params, locals }) => {
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
			capacity: e.capacity,
			state
		},
		fields,
		isOrganizer: organizer,
		loggedIn: !!me,
		full: me
			? isFull(e, me.id)
			: e.capacity !== null && countActiveRegistrations(e.id) >= e.capacity,
		hasContact: me ? listContacts(me.id).length > 0 : true,
		savedPlaces: saved.map(({ id, label, area }) => ({ id, label, area })),
		registration: reg && {
			status: reg.status,
			comment: reg.comment,
			answers: reg.answers,
			legs: reg.legs.map((l) => ({
				direction: l.direction,
				mode: l.mode,
				time: l.time,
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
	register: async ({ params, locals, request }) => {
		const me = locals.user;
		if (!me) redirect(303, `/login?next=/e/${params.slug}`);
		const { e } = loadEvent(params.slug, me.id);
		const state = registrationState(e);
		const existing = getRegistration(e.id, me.id);
		const isActive = existing?.status === 'active';

		// New registrations only while open; existing ones may update travel details until the end.
		const canRegister = state === 'open' && (isActive || !isFull(e, me.id));
		const canUpdateTravel =
			isActive && (state === 'open' || state === 'deadline' || state === 'closed');
		if (!canRegister && !canUpdateTravel) return fail(400, { error: 'closed' as const });
		const answersEditable = canRegister;

		const form = await request.formData();
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
					savedPlaces: listPlaces(me.id)
				})
			: { ok: true as const, legs: [], placesToSave: [] };

		if ((answers && !answers.ok) || !travel.ok) {
			return fail(400, {
				error: 'invalid' as const,
				answerErrors: answers && !answers.ok ? answers.errors : {},
				travelErrors: !travel.ok ? travel.errors : {}
			});
		}

		saveRegistration({
			eventId: e.id,
			userId: me.id,
			comment,
			answers: answers?.ok ? answers.answers : null,
			legs: travel.legs,
			placesToSave: travel.placesToSave
		});
		// Confirmation only for new (or renewed) registrations, not for every edit.
		if (!isActive) void sendConfirmation(e.id, me.id);
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
