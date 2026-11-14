import { isValidTimeZone, zonedToUtc } from '../datetime.js';
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
	| 'timezone';

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export function parseEventDetails(
	form: FormData
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

	const tz = isValidTimeZone(timezone) ? timezone : 'Europe/Berlin';
	const startsAt = zonedToUtc(str(form, 'startsAt'), tz);
	const endsAt = zonedToUtc(str(form, 'endsAt'), tz);
	if (!startsAt) errors.push('start');
	if (!endsAt) errors.push('end');
	if (startsAt && endsAt && endsAt <= startsAt) errors.push('end_before_start');

	const deadlineRaw = str(form, 'registrationDeadline');
	const registrationDeadline = deadlineRaw ? zonedToUtc(deadlineRaw, tz) : null;
	if (deadlineRaw && (!registrationDeadline || (endsAt && registrationDeadline > endsAt)))
		errors.push('deadline');

	const capacityRaw = str(form, 'capacity');
	const capacity = capacityRaw ? Number(capacityRaw) : null;
	if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000))
		errors.push('capacity');

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
			capacity
		}
	};
}

/** Everything needed before an event can go public. */
export function publishBlockers(e: Event): ('location' | 'past')[] {
	const blockers: ('location' | 'past')[] = [];
	if (e.lat === null || e.lon === null) blockers.push('location');
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
