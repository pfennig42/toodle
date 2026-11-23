import { error, fail } from '@sveltejs/kit';
import { getEventForOrganizer, requireOrganizerEvent, listFields } from '#lib/server/events.js';
import { normalizeEmail } from '#lib/server/auth/validation.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import { guestAccount } from '#lib/server/guests.js';
import {
	BROADCAST_SUBJECT_MAX,
	BROADCAST_TEXT_MAX,
	notifyAddedByOrganizer,
	notifyPromoted,
	sendBroadcast
} from '#lib/server/notifications.js';
import { getRegistrationById, promoteWaitlist } from '#lib/server/registrations.js';
import { parseName } from '#lib/server/profile.js';
import {
	addByOrganizer,
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

/** Adding people sends mails – keep it to what a real team does by hand. */
const addsPerEvent = createRateLimiter(100, 60 * 60 * 1000);
/** Messages to everybody: a few a day are plenty – nobody wants more. */
const broadcastsPerEvent = createRateLimiter(5, 24 * 60 * 60 * 1000);

export const actions: Actions = {
	/** A message to everybody registered (docs/konzept.md 4.6). */
	message: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		const form = await request.formData();
		const subject = String(form.get('subject') ?? '')
			.replace(/\s+/g, ' ')
			.trim();
		const text = String(form.get('text') ?? '').trim();
		const waitlist = form.get('waitlist') === 'on';
		const back = { subject, text, waitlist };
		if (e.status !== 'published')
			return fail(400, { messageError: 'unpublished' as const, ...back });
		if (!locals.user!.emailVerified)
			return fail(400, { messageError: 'unverified' as const, ...back });
		if (
			!subject ||
			subject.length > BROADCAST_SUBJECT_MAX ||
			!text ||
			text.length > BROADCAST_TEXT_MAX
		)
			return fail(400, { messageError: 'invalid' as const, ...back });
		if (!broadcastsPerEvent.take(e.id))
			return fail(429, { messageError: 'rate' as const, ...back });
		const count = sendBroadcast(e.id, locals.user!.id, { subject, text, waitlist });
		return { done: 'message' as const, messageCount: count };
	},
	/** Register somebody by name and e-mail (an account without password if the address is new). */
	add: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		const form = await request.formData();
		const rawName = String(form.get('name') ?? '');
		const rawEmail = String(form.get('email') ?? '');
		const back = { name: rawName.trim(), email: rawEmail.trim() };
		// mails go out in the organizers' name: only for public events, from a proven address
		if (e.status !== 'published') return fail(400, { addError: 'unpublished' as const, ...back });
		if (!locals.user!.emailVerified) return fail(400, { addError: 'unverified' as const, ...back });
		const name = parseName(rawName);
		const email = normalizeEmail(rawEmail);
		if (!name || !email) return fail(400, { addError: 'invalid' as const, ...back });
		if (!addsPerEvent.take(e.id)) return fail(429, { addError: 'rate' as const, ...back });
		// a new account gets the organizers' language for now (the person's own once they visit)
		const { userId } = guestAccount(name, email, locals.locale);
		if (addByOrganizer(e.id, userId) === 'exists')
			return fail(400, { addError: 'exists' as const, ...back });
		void notifyAddedByOrganizer(e.id, userId, locals.user!.id);
		return { done: 'added' as const, addedName: name };
	},
	withdraw: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		if (!withdrawByOrganizer(e.id, await regId(request))) return fail(404);
		// a place is free: the waiting list moves up
		void notifyPromoted(e.id, promoteWaitlist(e.id));
		return { done: 'withdrawn' as const };
	},
	/** Back in – or, from the waiting list, in right now (also beyond the capacity). */
	reactivate: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		const id = await regId(request);
		const before = getRegistrationById(e.id, id);
		if (!reactivateByOrganizer(e.id, id)) return fail(404);
		if (before?.status === 'waitlisted') void notifyPromoted(e.id, [before.userId]);
		return { done: 'reactivated' as const };
	},
	delete: async ({ params, locals, request }) => {
		const e = eventOf(params.id, locals.user!.id);
		if (!deleteWithdrawn(e.id, await regId(request))) return fail(404);
		return { done: 'deleted' as const };
	}
};
