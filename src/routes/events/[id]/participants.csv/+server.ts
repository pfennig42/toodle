import { error } from '@sveltejs/kit';
import { getEventForOrganizer, listFields } from '#lib/server/events.js';
import { fileSlug, toCsv } from '#lib/server/csv.js';
import { participantRows } from '#lib/server/participant-export.js';
import { listParticipants } from '#lib/server/participants.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals, url }) => {
	const e = locals.user && getEventForOrganizer(params.id, locals.user.id);
	if (!e) error(404);
	const all = url.searchParams.get('all') === '1';
	const people = listParticipants(e.id).filter((p) => all || p.status === 'active');
	const csv = toCsv(participantRows(listFields(e.id), people, e.timezone));
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${fileSlug(e.title)}.csv"`,
			'cache-control': 'private, no-store'
		}
	});
};
