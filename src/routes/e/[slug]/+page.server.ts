import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { eventOrganizer } from '#lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { getEventBySlug, listFields, registrationState } from '#lib/server/events.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const e = getEventBySlug(params.slug);
	if (!e) error(404);
	const isOrganizer =
		!!locals.user &&
		!!db
			.select()
			.from(eventOrganizer)
			.where(and(eq(eventOrganizer.eventId, e.id), eq(eventOrganizer.userId, locals.user.id)))
			.get();
	// Drafts are only visible to the team (as preview).
	if (e.status === 'draft' && !isOrganizer) error(404);

	return {
		event: {
			id: e.id,
			title: e.title,
			description: e.description,
			locationName: e.locationName,
			locationArea: e.locationArea,
			locationAddress: e.locationAddress,
			lat: e.lat,
			lon: e.lon,
			startsAt: e.startsAt,
			endsAt: e.endsAt,
			timezone: e.timezone,
			registrationDeadline: e.registrationDeadline,
			state: registrationState(e)
		},
		fields: listFields(e.id).map(({ id, type, label, help, required, config }) => ({
			id,
			type,
			label,
			help,
			required,
			config
		})),
		isOrganizer
	};
};
