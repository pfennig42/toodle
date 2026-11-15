import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { TravelDirection } from '#lib/forms.js';
import { CAR_STATUSES, type CarStatus } from '#lib/registration.js';
import { db } from '#lib/server/db/index.js';
import { eventOrganizer, travelLeg } from '#lib/server/db/schema.js';
import { getEventBySlug, listFields } from '#lib/server/events.js';
import {
	buildDirectionView,
	canLink,
	canUnlink,
	isDriver,
	isSeeker
} from '#lib/server/ride-matching.js';
import { publicView } from '#lib/server/ride-view.js';
import { getLink, linkRide, loadRideData, unlinkRide } from '#lib/server/rides.js';
import { notifyRideLink } from '#lib/server/notifications.js';
import { rideTravelTime } from '#lib/server/routing.js';
import type { Actions, PageServerLoad } from './$types';

function access(slug: string, userId: string) {
	const e = getEventBySlug(slug);
	if (!e) error(404);
	const isOrganizer = !!db
		.select()
		.from(eventOrganizer)
		.where(and(eq(eventOrganizer.eventId, e.id), eq(eventOrganizer.userId, userId)))
		.get();
	if (e.status === 'draft' && !isOrganizer) error(404);
	const data = loadRideData(e.id);
	const me = data.participants.find((p) => p.userId === userId) ?? null;
	return { e, isOrganizer, data, me };
}

const directionsOf = (eventId: string): TravelDirection[] =>
	listFields(eventId).find((f) => f.type === 'travel')?.config.directions ?? [];

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	const { e, isOrganizer, data, me } = access(params.slug, locals.user.id);
	const event = { id: e.id, slug: e.slug, title: e.title, timezone: e.timezone };
	if (!me && !isOrganizer) return { allowed: false as const, event };

	const directions = directionsOf(e.id);
	const requested = url.searchParams.get('dir') as TravelDirection;
	const direction = directions.includes(requested) ? requested : (directions[0] ?? 'to');
	const eventPoint = e.lat !== null && e.lon !== null ? { lat: e.lat, lon: e.lon } : null;

	const travel = await rideTravelTime(data.participants, eventPoint);
	const counts = Object.fromEntries(
		directions.map((d) => [
			d,
			{
				drivers: data.participants.filter((p) => isDriver(p.legs[d])).length,
				seekers: data.participants.filter((p) => isSeeker(p.legs[d])).length
			}
		])
	);

	return {
		allowed: true as const,
		event,
		directions,
		direction,
		counts,
		isOrganizer,
		registered: !!me,
		myRegistrationId: me?.registrationId ?? null,
		view: eventPoint
			? publicView(
					buildDirectionView(
						data.participants,
						data.links,
						me?.registrationId ?? null,
						direction,
						eventPoint,
						travel
					)
				)
			: null,
		links: data.links
			.filter((l) => l.direction === direction)
			.map(({ id, driverRegistrationId, passengerRegistrationId }) => ({
				id,
				driverRegistrationId,
				passengerRegistrationId
			}))
	};
};

const dirParam = (v: FormDataEntryValue | null): TravelDirection | null =>
	v === 'to' || v === 'from' ? v : null;

export const actions: Actions = {
	link: async ({ params, locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const { e, isOrganizer, data, me } = access(params.slug, locals.user.id);
		const form = await request.formData();
		const direction = dirParam(form.get('direction'));
		const driver = data.participants.find((p) => p.registrationId === form.get('driver'));
		const passenger = data.participants.find((p) => p.registrationId === form.get('passenger'));
		if (
			!direction ||
			!canLink(
				{ registrationId: me?.registrationId ?? null, isOrganizer },
				driver,
				passenger,
				direction
			)
		)
			return fail(403, { error: 'forbidden' as const });
		linkRide(e.id, direction, driver!.registrationId, passenger!.registrationId, locals.user.id);
		void notifyRideLink(
			e.id,
			direction,
			driver!.registrationId,
			passenger!.registrationId,
			locals.user.id
		);
		return { linked: true };
	},

	unlink: async ({ params, locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const { e, isOrganizer, me } = access(params.slug, locals.user.id);
		const link = getLink(e.id, String((await request.formData()).get('link')));
		if (!link || !canUnlink({ registrationId: me?.registrationId ?? null, isOrganizer }, link))
			return fail(403, { error: 'forbidden' as const });
		unlinkRide(link.id);
		return { unlinked: true };
	},

	/** Drivers can switch "take people / full / nobody" right here – one tap. */
	carStatus: async ({ params, locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const { me } = access(params.slug, locals.user.id);
		const form = await request.formData();
		const direction = dirParam(form.get('direction'));
		const status = form.get('status') as CarStatus;
		if (!me || !direction || !CAR_STATUSES.includes(status) || !isDriver(me.legs[direction]))
			return fail(403, { error: 'forbidden' as const });
		db.update(travelLeg)
			.set({ carStatus: status })
			.where(
				and(eq(travelLeg.registrationId, me.registrationId), eq(travelLeg.direction, direction))
			)
			.run();
		return { status };
	}
};
