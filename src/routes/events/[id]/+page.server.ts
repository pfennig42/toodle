import { fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import type { TravelDirection } from '#lib/forms.js';
import {
	getEventForOrganizer,
	requireOrganizerEvent,
	listFields,
	publishBlockers,
	setEventStatus
} from '#lib/server/events.js';
import { countActiveRegistrations } from '#lib/server/registrations.js';
import { seeksNow } from '#lib/server/ride-matching.js';
import { loadRideData } from '#lib/server/rides.js';
import type { Actions, PageServerLoad } from './$types';

/** The event at a glance: success after publishing, sharing, a few numbers. Settings live elsewhere. */
export const load: PageServerLoad = async ({ params, locals, url, parent }) => {
	const { event: summary } = await parent();
	const e = requireOrganizerEvent(params.id, locals.user!.id);
	const qr = await QRCode.toString(summary.publicUrl, {
		type: 'svg',
		margin: 1,
		errorCorrectionLevel: 'M'
	});

	// people still looking for a ride (any direction), for the "rides" number
	const directions: TravelDirection[] =
		listFields(e.id).find((f) => f.type === 'travel')?.config.directions ?? [];
	const { participants, links } = loadRideData(e.id);
	const seekingOpen = directions.reduce((n, d) => {
		const dirLinks = links.filter((l) => l.direction === d);
		const taken = new Set(dirLinks.map((l) => l.passengerRegistrationId));
		return (
			n +
			participants.filter((p) => seeksNow(p, d, dirLinks) && !taken.has(p.registrationId)).length
		);
	}, 0);

	return {
		overview: {
			startsAt: e.startsAt,
			endsAt: e.endsAt,
			timezone: e.timezone,
			startHasTime: e.startHasTime,
			endHasTime: e.endHasTime,
			deadlineHasTime: e.deadlineHasTime,
			registrationDeadline: e.registrationDeadline,
			capacity: e.capacity,
			rideVisibility: e.rideVisibility,
			locationName: e.locationName,
			locationArea: e.locationArea,
			registrations: countActiveRegistrations(e.id),
			hasTravel: directions.length > 0,
			seekingOpen,
			blockers: publishBlockers(e, locals.user!)
		},
		qr,
		email: locals.user!.email,
		published: url.searchParams.has('published')
	};
};

export const actions: Actions = {
	/** Drafts can be published right from the overview. */
	publish: ({ params, locals }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) redirect(303, '/');
		if (publishBlockers(e, locals.user!).length) return fail(400, { error: 'blocked' as const });
		setEventStatus(e.id, 'published');
		redirect(303, `/events/${e.id}?published=1`);
	}
};
