import { fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { m } from '#lib/paraglide/messages.js';
import {
	deleteEvent,
	duplicateEvent,
	getEventForOrganizer,
	listFields,
	publishBlockers,
	setEventStatus,
	setRegistrationClosed
} from '#lib/server/events.js';
import { countActiveRegistrations } from '#lib/server/registrations.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url, parent }) => {
	const { event: summary } = await parent();
	const e = getEventForOrganizer(params.id, locals.user!.id)!;
	const qr = await QRCode.toString(summary.publicUrl, {
		type: 'svg',
		margin: 1,
		errorCorrectionLevel: 'M'
	});
	return {
		overview: {
			startsAt: e.startsAt,
			endsAt: e.endsAt,
			timezone: e.timezone,
			registrationDeadline: e.registrationDeadline,
			registrationClosed: e.registrationClosed,
			capacity: e.capacity,
			locationName: e.locationName,
			locationAddress: e.locationAddress,
			fieldCount: listFields(e.id).length,
			registrations: countActiveRegistrations(e.id),
			blockers: publishBlockers(e)
		},
		qr,
		created: url.searchParams.has('created')
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
		if (publishBlockers(e).length) return fail(400, { error: 'blocked' });
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
		if (confirm !== e.title) return fail(400, { error: 'confirm' });
		deleteEvent(e.id);
		redirect(303, '/');
	}
};
