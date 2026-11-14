import { utcToZoned, DEFAULT_TIMEZONE } from './datetime.js';

export type EventFormValues = {
	title: string;
	description: string;
	locationName: string;
	location: { address: string; area: string; lat: number; lon: number } | null;
	startsAt: string;
	endsAt: string;
	timezone: string;
	registrationDeadline: string;
	capacity: string;
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
};

export function formValuesFromEvent(e: EventLike): EventFormValues {
	return {
		title: e.title,
		description: e.description,
		locationName: e.locationName,
		location:
			e.locationAddress && e.locationArea && e.lat !== null && e.lon !== null
				? { address: e.locationAddress, area: e.locationArea, lat: e.lat, lon: e.lon }
				: null,
		startsAt: utcToZoned(e.startsAt, e.timezone),
		endsAt: utcToZoned(e.endsAt, e.timezone),
		timezone: e.timezone,
		registrationDeadline: e.registrationDeadline
			? utcToZoned(e.registrationDeadline, e.timezone)
			: '',
		capacity: e.capacity?.toString() ?? ''
	};
}

/** Re-fill the form from a failed submission. */
export function formValuesFromForm(form: FormData): EventFormValues {
	const s = (k: string) => String(form.get(k) ?? '');
	const lat = Number(form.get('lat'));
	const lon = Number(form.get('lon'));
	return {
		title: s('title'),
		description: s('description'),
		locationName: s('locationName'),
		location:
			s('address') && Number.isFinite(lat) && Number.isFinite(lon)
				? { address: s('address'), area: s('area'), lat, lon }
				: null,
		startsAt: s('startsAt'),
		endsAt: s('endsAt'),
		timezone: s('timezone') || DEFAULT_TIMEZONE,
		registrationDeadline: s('registrationDeadline'),
		capacity: s('capacity')
	};
}

export const emptyFormValues = (): EventFormValues => ({
	title: '',
	description: '',
	locationName: '',
	location: null,
	startsAt: '',
	endsAt: '',
	timezone: DEFAULT_TIMEZONE,
	registrationDeadline: '',
	capacity: ''
});
