import { error, fail } from '@sveltejs/kit';
import { getEventForOrganizer, requireOrganizerEvent, listFields } from '#lib/server/events.js';
import {
	deleteWithdrawn,
	listParticipants,
	reactivateByOrganizer,
	withdrawByOrganizer
} from '#lib/server/participants.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const e = requireOrganizerEvent(params.id, locals.user!.id);
	return {
		fields: listFields(e.id).map(({ id, type, label }) => ({ id, type, label })),
		// Organizers see station/area names like everyone else – never coordinates or addresses.
		participants: listParticipants(e.id).map((p) => ({
			...p,
			legs: p.legs.map((l) => ({
				direction: l.direction,
				mode: l.mode,
				time: l.time,
				hasClock: l.hasClock,
				placeLabel: l.placeLabel,
				placeArea: l.placeArea,
				carStatus: l.carStatus,
				carNote: l.carNote,
				pickups: l.pickups,
				ridesWith: l.ridesWith,
				passengers: l.passengers
			}))
		})),
		timezone: e.timezone,
		capacity: e.capacity
	};
};

function eventOf(id: string, userId: string) {
	const e = getEventForOrganizer(id, userId);
	if (!e) error(404);
	return e;
}

const regId = async (request: Request) => String((await request.formData()).get('registration'));

export const actions: Actions = {
	withdraw: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		if (!withdrawByOrganizer(e.id, await regId(request))) return fail(404);
		return { done: 'withdrawn' as const };
	},
	reactivate: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		if (!reactivateByOrganizer(e.id, await regId(request))) return fail(404);
		return { done: 'reactivated' as const };
	},
	delete: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		if (!deleteWithdrawn(e.id, await regId(request))) return fail(404);
		return { done: 'deleted' as const };
	}
};
