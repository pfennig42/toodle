import { listEventsForOrganizer, registrationState } from '#lib/server/events.js';
import { listRegistrationsForUser } from '#lib/server/registrations.js';
import { dismissVisit, listUnfinished } from '#lib/server/visits.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) return { events: null, registered: [], unfinished: [] };
	const now = new Date();
	const events = listEventsForOrganizer(locals.user.id).map((e) => ({
		id: e.id,
		title: e.title,
		locationArea: e.locationArea,
		locationName: e.locationName,
		startsAt: e.startsAt,
		endsAt: e.endsAt,
		timezone: e.timezone,
		startHasTime: e.startHasTime,
		endHasTime: e.endHasTime,
		state: registrationState(e, now)
	}));
	const registered = listRegistrationsForUser(locals.user.id)
		.filter((e) => e.status !== 'draft' && e.endsAt > now)
		.map((e) => ({
			id: e.id,
			slug: e.slug,
			title: e.title,
			locationArea: e.locationArea,
			locationName: e.locationName,
			startsAt: e.startsAt,
			endsAt: e.endsAt,
			timezone: e.timezone,
			startHasTime: e.startHasTime,
			endHasTime: e.endHasTime,
			state: registrationState(e, now)
		}));
	// opened, but not registered yet – e.g. left for the profile in between
	const unfinished = listUnfinished(locals.user.id, now).map((e) => ({
		id: e.id,
		slug: e.slug,
		title: e.title,
		locationArea: e.locationArea,
		locationName: e.locationName,
		startsAt: e.startsAt,
		endsAt: e.endsAt,
		timezone: e.timezone,
		startHasTime: e.startHasTime,
		endHasTime: e.endHasTime,
		state: registrationState(e, now)
	}));
	return {
		registered,
		unfinished,
		events: {
			current: events.filter((e) => e.state !== 'archived' && e.state !== 'past'),
			past: events.filter((e) => e.state === 'past').reverse(),
			archived: events.filter((e) => e.state === 'archived').reverse()
		}
	};
};

export const actions: Actions = {
	/** "Not interested": hides an unfinished registration from the start page */
	dismiss: async ({ request, locals }) => {
		if (!locals.user) return { ok: false };
		dismissVisit(locals.user.id, String((await request.formData()).get('eventId') ?? ''));
		return { ok: true };
	}
};
