import { error } from '@sveltejs/kit';
import { getEventForOrganizer, registrationState } from '#lib/server/events.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params, locals, url }) => {
	const e = getEventForOrganizer(params.id, locals.user!.id);
	if (!e) error(404);
	return {
		event: {
			id: e.id,
			slug: e.slug,
			title: e.title,
			status: e.status,
			state: registrationState(e),
			publicUrl: `${url.origin}/e/${e.slug}`
		}
	};
};
