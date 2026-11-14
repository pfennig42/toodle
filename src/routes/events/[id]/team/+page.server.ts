import { error, fail } from '@sveltejs/kit';
import {
	createOrganizerInvite,
	getEventForOrganizer,
	listOrganizers,
	pendingInviteCount,
	removeOrganizer
} from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => ({
	team: listOrganizers(params.id),
	pendingInvites: pendingInviteCount(params.id)
});

export const actions: Actions = {
	invite: ({ params, locals, url }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		const token = createOrganizerInvite(e.id, locals.user!.id);
		return { inviteUrl: `${url.origin}/invite/${token}` };
	},
	remove: async ({ params, locals, request }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		const userId = String((await request.formData()).get('userId'));
		if (!removeOrganizer(e.id, userId)) return fail(400, { error: 'last' });
		return { removed: true };
	}
};
