import { getEventForOrganizer, listFields } from '#lib/server/events.js';
import { listParticipants } from '#lib/server/participants.js';
import {
	dayPlans,
	modeCounts,
	summarizeFields,
	type PlanningPerson
} from '#lib/server/planning.js';
import { travelTimeFor } from '#lib/server/routing.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const e = getEventForOrganizer(params.id, locals.user!.id)!;
	const fields = listFields(e.id);
	const people: PlanningPerson[] = listParticipants(e.id)
		.filter((p) => p.status === 'active')
		.map((p) => ({
			registrationId: p.registrationId,
			name: p.name,
			answers: p.answers,
			legs: Object.fromEntries(p.legs.map((l) => [l.direction, l]))
		}));
	const point = e.lat !== null && e.lon !== null ? { lat: e.lat, lon: e.lon } : null;
	// arrival estimates: home → venue
	const travel = point
		? await travelTimeFor([
				point,
				...people.flatMap((p) => {
					const to = p.legs.to;
					return to && to.lat !== null && to.lon !== null ? [{ lat: to.lat, lon: to.lon }] : [];
				})
			])
		: undefined;
	const directions = fields.find((f) => f.type === 'travel')?.config.directions ?? [];

	return {
		total: people.length,
		days: dayPlans(
			people,
			fields,
			{
				startsAt: e.startsAt,
				endsAt: e.endsAt,
				timezone: e.timezone,
				point
			},
			travel
		),
		summary: summarizeFields(fields, people),
		mobility: directions.map((direction) => ({ direction, counts: modeCounts(people, direction) })),
		timezone: e.timezone
	};
};
