import { fail, redirect } from '@sveltejs/kit';
import { acceptOrganizerInvite, findOrganizerInvite } from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

// Like the magic link: show a confirmation button instead of acting on GET.
export const load: PageServerLoad = ({ params }) => {
	const found = findOrganizerInvite(params.token);
	return { title: found?.event.title ?? null };
};

export const actions: Actions = {
	default: ({ params, locals }) => {
		const eventId = acceptOrganizerInvite(params.token, locals.user!.id);
		if (!eventId) return fail(400, { invalid: true });
		redirect(303, `/events/${eventId}`);
	}
};
