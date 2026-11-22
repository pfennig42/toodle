import { error, fail } from '@sveltejs/kit';
import type { TravelDirection } from '#lib/forms.js';
import { getEventForOrganizer, requireOrganizerEvent, listFields } from '#lib/server/events.js';
import {
	bestMatch,
	canLink,
	drivesNow,
	isSeeker,
	searchPoints,
	seeksNow
} from '#lib/server/ride-matching.js';
import { publicLeg } from '#lib/server/ride-view.js';
import { getLink, linkRide, loadRideData, unlinkRide } from '#lib/server/rides.js';
import { notifyRideLink } from '#lib/server/notifications.js';
import { rideTravelTime } from '#lib/server/routing.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const e = requireOrganizerEvent(params.id, locals.user!.id);
	const directions: TravelDirection[] =
		listFields(e.id).find((f) => f.type === 'travel')?.config.directions ?? [];
	const { participants, links } = loadRideData(e.id);
	const eventPoint = e.lat !== null && e.lon !== null ? { lat: e.lat, lon: e.lon } : null;
	const byId = new Map(participants.map((p) => [p.registrationId, p]));
	const travel = await rideTravelTime(participants, eventPoint);

	const overview = directions.map((direction) => {
		const dirLinks = links.filter((l) => l.direction === direction);
		const assigned = new Set(dirLinks.map((l) => l.passengerRegistrationId));
		const drivers = participants.filter((p) => drivesNow(p, direction, dirLinks));

		return {
			direction,
			drivers: drivers.map((d) => ({
				registrationId: d.registrationId,
				name: d.name,
				leg: publicLeg(d.legs[direction]!),
				passengers: dirLinks
					.filter((l) => l.driverRegistrationId === d.registrationId)
					.map((l) => ({ linkId: l.id, name: byId.get(l.passengerRegistrationId)?.name ?? '?' }))
			})),
			openSeekers: participants
				.filter((p) => seeksNow(p, direction, dirLinks) && !assigned.has(p.registrationId))
				.map((s) => {
					const leg = s.legs[direction]!;
					const pts = searchPoints(leg);
					return {
						registrationId: s.registrationId,
						name: s.name,
						leg: publicLeg(leg),
						// Drivers sorted by detour for this person – the organizer picks one.
						options: drivers
							.filter((d) => d !== s)
							.map((d) => ({
								registrationId: d.registrationId,
								name: d.name,
								carStatus: d.legs[direction]!.carStatus,
								detourMin: eventPoint
									? (bestMatch(d.legs[direction]!, pts, eventPoint, direction, travel)?.detourMin ??
										null)
									: null
							}))
							.sort((a, b) => (a.detourMin ?? Infinity) - (b.detourMin ?? Infinity))
					};
				}),
			// Everyone without a plan yet: undecided or no travel info for this direction
			undecided: participants
				.filter(
					(p) =>
						!assigned.has(p.registrationId) &&
						(!p.legs[direction] || p.legs[direction]!.mode === 'undecided')
				)
				.map((p) => p.name),
			counts: {
				drivers: drivers.length,
				offering: drivers.filter((d) => d.legs[direction]!.carStatus === 'offering').length,
				seekers: participants.filter((p) => seeksNow(p, direction, dirLinks)).length,
				assigned: assigned.size,
				transitOnly: participants.filter(
					(p) => p.legs[direction]?.mode === 'transit' && !isSeeker(p.legs[direction])
				).length
			}
		};
	});

	return { overview, timezone: e.timezone, slug: e.slug };
};

export const actions: Actions = {
	assign: async ({ params, locals, request }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		const form = await request.formData();
		const direction = form.get('direction');
		if (direction !== 'to' && direction !== 'from') return fail(400);
		const { participants, links } = loadRideData(e.id);
		const driver = participants.find((p) => p.registrationId === form.get('driver'));
		const passenger = participants.find((p) => p.registrationId === form.get('passenger'));
		const organizer = { registrationId: null, isOrganizer: true };
		if (!driver || !passenger || !canLink(organizer, driver, passenger, direction, links))
			return fail(400, { error: 'invalid' as const });
		linkRide(e.id, direction, driver.registrationId, passenger.registrationId, locals.user!.id);
		void notifyRideLink(
			e.id,
			direction,
			driver.registrationId,
			passenger.registrationId,
			locals.user!.id
		);
		return { assigned: true };
	},
	unlink: async ({ params, locals, request }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		const link = getLink(e.id, String((await request.formData()).get('link')));
		if (!link) return fail(404);
		unlinkRide(link.id);
		return { unlinked: true };
	}
};
