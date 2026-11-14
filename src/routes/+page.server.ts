import { listEventsForOrganizer, registrationState } from '#lib/server/events.js';
import { listRegistrationsForUser } from '#lib/server/registrations.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) return { events: null, registered: [] };
	const now = new Date();
	const events = listEventsForOrganizer(locals.user.id).map((e) => ({
		id: e.id,
		title: e.title,
		locationArea: e.locationArea,
		locationName: e.locationName,
		startsAt: e.startsAt,
		endsAt: e.endsAt,
		timezone: e.timezone,
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
			state: registrationState(e, now)
		}));
	return {
		registered,
		events: {
			current: events.filter((e) => e.state !== 'archived' && e.state !== 'past'),
			past: events.filter((e) => e.state === 'past').reverse(),
			archived: events.filter((e) => e.state === 'archived').reverse()
		}
	};
};
