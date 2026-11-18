import { splitLocal, utcToZoned, DEFAULT_TIMEZONE } from './datetime.js';
import { isRideVisibility, type RideVisibility } from './ride-visibility.js';

export type EventFormValues = {
	title: string;
	description: string;
	locationName: string;
	location: { address: string; area: string; lat: number; lon: number } | null;
	/** "2027-07-16" */
	startDate: string;
	/** "18:00" or "" (no time) */
	startTime: string;
	endDate: string;
	endTime: string;
	timezone: string;
	deadlineDate: string;
	deadlineTime: string;
	capacity: string;
	contactEmail: string;
	rideVisibility: RideVisibility;
};

type EventLike = {
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
	contactEmail: string | null;
	rideVisibility: RideVisibility;
	startHasTime: boolean;
	endHasTime: boolean;
	deadlineHasTime: boolean;
};

const parts = (d: Date | null, tz: string, hasTime: boolean) => {
	if (!d) return ['', ''] as const;
	const [date, time] = splitLocal(utcToZoned(d, tz));
	return [date, hasTime ? time : ''] as const;
};

/** `fallbackEmail`: prefills the contact address of (legacy) events that have none yet. */
export function formValuesFromEvent(e: EventLike, fallbackEmail = ''): EventFormValues {
	return {
		title: e.title,
		description: e.description,
		locationName: e.locationName,
		location:
			e.locationAddress && e.locationArea && e.lat !== null && e.lon !== null
				? { address: e.locationAddress, area: e.locationArea, lat: e.lat, lon: e.lon }
				: null,
		...(([startDate, startTime]) => ({ startDate, startTime }))(
			parts(e.startsAt, e.timezone, e.startHasTime)
		),
		...(([endDate, endTime]) => ({ endDate, endTime }))(parts(e.endsAt, e.timezone, e.endHasTime)),
		...(([deadlineDate, deadlineTime]) => ({ deadlineDate, deadlineTime }))(
			parts(e.registrationDeadline, e.timezone, e.deadlineHasTime)
		),
		timezone: e.timezone,
		capacity: e.capacity?.toString() ?? '',
		contactEmail: e.contactEmail ?? fallbackEmail,
		rideVisibility: e.rideVisibility
	};
}

/** Re-fill the form from a failed submission. */
export function formValuesFromForm(form: FormData): EventFormValues {
	const s = (k: string) => String(form.get(k) ?? '');
	const lat = Number(form.get('lat'));
	const lon = Number(form.get('lon'));
	const visibility = s('rideVisibility');
	return {
		title: s('title'),
		description: s('description'),
		locationName: s('locationName'),
		location:
			s('address') && Number.isFinite(lat) && Number.isFinite(lon)
				? { address: s('address'), area: s('area'), lat, lon }
				: null,
		startDate: s('startDate'),
		startTime: s('startTime'),
		endDate: s('endDate'),
		endTime: s('endTime'),
		timezone: s('timezone') || DEFAULT_TIMEZONE,
		deadlineDate: s('deadlineDate'),
		deadlineTime: s('deadlineTime'),
		capacity: s('capacity'),
		contactEmail: s('contactEmail'),
		rideVisibility: isRideVisibility(visibility) ? visibility : 'public'
	};
}

/** `contactEmail`: prefilled with the creator's own address. */
export const emptyFormValues = (contactEmail = ''): EventFormValues => ({
	title: '',
	description: '',
	locationName: '',
	location: null,
	startDate: '',
	startTime: '',
	endDate: '',
	endTime: '',
	timezone: DEFAULT_TIMEZONE,
	deadlineDate: '',
	deadlineTime: '',
	capacity: '',
	contactEmail,
	rideVisibility: 'public'
});
