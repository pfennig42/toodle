import { listEventsForOrganizer, registrationState } from '#lib/server/events.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) return { events: null };
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
	return {
		events: {
			current: events.filter((e) => e.state !== 'archived' && e.state !== 'past'),
			past: events.filter((e) => e.state === 'past').reverse(),
			archived: events.filter((e) => e.state === 'archived').reverse()
		}
	};
};
