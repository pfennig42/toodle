import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import {
	deleteEvent,
	duplicateEvent,
	getEventForOrganizer,
	publishBlockers,
	setEventStatus,
	setRegistrationClosed
} from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

/** Settings › General: registration open/closed, visibility, duplicate, archive, delete. */
export const load: PageServerLoad = ({ params, locals }) => {
	const e = getEventForOrganizer(params.id, locals.user!.id)!;
	return {
		settings: {
			status: e.status,
			registrationClosed: e.registrationClosed,
			blockers: publishBlockers(e)
		}
	};
};

function requireEvent(id: string, userId: string) {
	const e = getEventForOrganizer(id, userId);
	if (!e) redirect(303, '/');
	return e;
}

export const actions: Actions = {
	publish: ({ params, locals }) => {
		const e = requireEvent(params.id, locals.user!.id);
		if (publishBlockers(e).length) return fail(400, { error: 'blocked' as const });
		setEventStatus(e.id, 'published');
	},
	unpublish: ({ params, locals }) => {
		setEventStatus(requireEvent(params.id, locals.user!.id).id, 'draft');
	},
	close: ({ params, locals }) => {
		setRegistrationClosed(requireEvent(params.id, locals.user!.id).id, true);
	},
	reopen: ({ params, locals }) => {
		setRegistrationClosed(requireEvent(params.id, locals.user!.id).id, false);
	},
	archive: ({ params, locals }) => {
		setEventStatus(requireEvent(params.id, locals.user!.id).id, 'archived');
	},
	unarchive: ({ params, locals }) => {
		setEventStatus(requireEvent(params.id, locals.user!.id).id, 'draft');
	},
	duplicate: ({ params, locals }) => {
		const copy = duplicateEvent(
			requireEvent(params.id, locals.user!.id),
			locals.user!.id,
			m.event_copy_suffix()
		);
		redirect(303, `/events/${copy.id}/details?copied=1`);
	},
	delete: async ({ params, locals, request }) => {
		const e = requireEvent(params.id, locals.user!.id);
		const confirm = String((await request.formData()).get('confirm') ?? '').trim();
		if (confirm !== e.title) return fail(400, { error: 'confirm' as const });
		deleteEvent(e.id);
		redirect(303, '/');
	}
};
