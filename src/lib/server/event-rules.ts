import { isValidTimeZone, zonedDateTime } from '../datetime.js';
import { isRideVisibility, type RideVisibility } from '../ride-visibility.js';
import { normalizeEmail } from './auth/validation.js';
import type { Event } from './db/schema.js';

/* ------------------------------------------------------------------ details */

export type EventDetails = {
	title: string;
	description: string;
	locationName: string;
	locationAddress: string | null;
	locationArea: string | null;
	lat: number | null;
	lon: number | null;
	startsAt: Date;
	endsAt: Date;
	timezone: string;
	registrationDeadline: Date | null;
	capacity: number | null;
	contactEmail: string;
	rideVisibility: RideVisibility;
	startHasTime: boolean;
	endHasTime: boolean;
	deadlineHasTime: boolean;
};

export type DetailsError =
	| 'title'
	| 'description'
	| 'location'
	| 'start'
	| 'end'
	| 'end_before_start'
	| 'deadline'
	| 'capacity'
	| 'contact_email'
	| 'timezone'
	| 'visibility_widen';

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export function parseEventDetails(
	form: FormData,
	{ requireLocation = false }: { requireLocation?: boolean } = {}
): { ok: true; details: EventDetails } | { ok: false; errors: DetailsError[] } {
	const errors: DetailsError[] = [];
	const title = str(form, 'title');
	const description = str(form, 'description');
	const locationName = str(form, 'locationName');
	const timezone = str(form, 'timezone') || 'Europe/Berlin';

	if (!title || title.length > 150) errors.push('title');
	if (description.length > 5000) errors.push('description');
	if (locationName.length > 150) errors.push('location');
	if (!isValidTimeZone(timezone)) errors.push('timezone');

	const address = str(form, 'address');
	let location = {
		address: null as string | null,
		area: null as string | null,
		lat: null as number | null,
		lon: null as number | null
	};
	if (address) {
		const lat = Number(form.get('lat'));
		const lon = Number(form.get('lon'));
		const area = str(form, 'area');
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !area || address.length > 300)
			errors.push('location');
		else location = { address, area, lat, lon };
	}

	// Creating an event publishes it at the end – that needs the address (ride view).
	if (requireLocation && !address && !errors.includes('location')) errors.push('location');

	const tz = isValidTimeZone(timezone) ? timezone : 'Europe/Berlin';
	// Times are optional: no time = whole day (start 00:00, end and deadline 23:59).
	const start = zonedDateTime(str(form, 'startDate'), str(form, 'startTime'), tz, '00:00');
	const end = zonedDateTime(str(form, 'endDate'), str(form, 'endTime'), tz, '23:59');
	const startsAt = start?.at ?? null;
	const endsAt = end?.at ?? null;
	if (!startsAt) errors.push('start');
	if (!endsAt) errors.push('end');
	if (startsAt && endsAt && endsAt <= startsAt) errors.push('end_before_start');

	const deadlineDate = str(form, 'deadlineDate');
	const deadline = deadlineDate
		? zonedDateTime(deadlineDate, str(form, 'deadlineTime'), tz, '23:59')
		: null;
	const registrationDeadline = deadline?.at ?? null;
	if (deadlineDate && (!registrationDeadline || (endsAt && registrationDeadline > endsAt)))
		errors.push('deadline');

	const capacityRaw = str(form, 'capacity');
	const capacity = capacityRaw ? Number(capacityRaw) : null;
	if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000))
		errors.push('capacity');

	const contactEmail = normalizeEmail(form.get('contactEmail'));
	if (!contactEmail) errors.push('contact_email');

	const visibilityRaw = str(form, 'rideVisibility');
	const rideVisibility = isRideVisibility(visibilityRaw) ? visibilityRaw : 'public';

	if (errors.length) return { ok: false, errors };
	return {
		ok: true,
		details: {
			title,
			description,
			locationName,
			locationAddress: location.address,
			locationArea: location.area,
			lat: location.lat,
			lon: location.lon,
			startsAt: startsAt!,
			endsAt: endsAt!,
			timezone: tz,
			registrationDeadline,
			capacity,
			contactEmail: contactEmail!,
			rideVisibility,
			startHasTime: start!.hasTime,
			endHasTime: end!.hasTime,
			deadlineHasTime: deadline?.hasTime ?? true
		}
	};
}

/** Everything needed before an event can go public. */
export type PublishBlocker = 'location' | 'contact' | 'past';

export function publishBlockers(e: Event): PublishBlocker[] {
	const blockers: PublishBlocker[] = [];
	if (e.lat === null || e.lon === null) blockers.push('location');
	if (!e.contactEmail) blockers.push('contact');
	if (e.endsAt.getTime() < Date.now()) blockers.push('past');
	return blockers;
}

export type RegistrationState = 'draft' | 'open' | 'closed' | 'deadline' | 'past' | 'archived';

export function registrationState(e: Event, now = new Date()): RegistrationState {
	if (e.status === 'archived') return 'archived';
	if (e.status === 'draft') return 'draft';
	if (e.endsAt <= now) return 'past';
	if (e.registrationClosed) return 'closed';
	if (e.registrationDeadline && e.registrationDeadline <= now) return 'deadline';
	return 'open';
}
