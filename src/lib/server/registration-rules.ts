import { zonedToUtc } from '../datetime.js';
import type { FieldConfig, FieldType, TravelDirection } from '../forms.js';
import {
	CAR_NOTE_MAX,
	CAR_STATUSES,
	MAX_PICKUPS,
	TRAVEL_MODES,
	type AnswerValue,
	type CarStatus,
	type GeoPoint,
	type TravelMode
} from '../registration.js';

type FieldLite = {
	id: string;
	type: FieldType;
	required: boolean;
	config: FieldConfig;
};

export type AnswerError = 'required' | 'invalid';

/** Reads `field_<id>` inputs for all non-travel fields. */
export function parseAnswers(
	fields: FieldLite[],
	form: FormData
):
	| { ok: true; answers: Map<string, AnswerValue> }
	| { ok: false; errors: Record<string, AnswerError> } {
	const answers = new Map<string, AnswerValue>();
	const errors: Record<string, AnswerError> = {};

	for (const field of fields) {
		if (field.type === 'travel') continue;
		const key = `field_${field.id}`;
		const raw = form.get(key);
		const text = typeof raw === 'string' ? raw.trim() : '';
		let value: AnswerValue | null = null;

		switch (field.type) {
			case 'short_text':
			case 'long_text': {
				const max = field.type === 'short_text' ? 500 : 5000;
				if (text.length > max) errors[field.id] = 'invalid';
				else if (text) value = text;
				break;
			}
			case 'number': {
				if (text) {
					const n = Number(text.replace(',', '.'));
					if (Number.isFinite(n)) value = n;
					else errors[field.id] = 'invalid';
				}
				break;
			}
			case 'date': {
				if (text) {
					if (/^\d{4}-\d{2}-\d{2}$/.test(text)) value = text;
					else errors[field.id] = 'invalid';
				}
				break;
			}
			case 'single_choice': {
				if (text) {
					if (field.config.options?.includes(text)) value = text;
					else errors[field.id] = 'invalid';
				}
				break;
			}
			case 'multi_choice': {
				const picked = form.getAll(key).filter((v): v is string => typeof v === 'string');
				if (picked.some((p) => !field.config.options?.includes(p))) errors[field.id] = 'invalid';
				else if (picked.length) value = field.config.options!.filter((o) => picked.includes(o));
				break;
			}
			case 'checkbox': {
				value = raw === 'on' || raw === 'true';
				if (!value) value = null;
				break;
			}
		}

		if (errors[field.id]) continue;
		if (value === null) {
			if (field.required) errors[field.id] = 'required';
			continue;
		}
		answers.set(field.id, value);
	}

	return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

/* -------------------------------------------------------------------- travel */

export type PlaceSnapshot = {
	label: string;
	address: string;
	area: string;
	lat: number;
	lon: number;
};

export type ParsedLeg = {
	direction: TravelDirection;
	mode: TravelMode;
	time: Date | null;
	/** false when only the day was given (time stored as noon) */
	hasClock: boolean;
	place: PlaceSnapshot | null;
	carStatus: CarStatus | null;
	carNote: string;
	pickups: { label: string; area: string; lat: number; lon: number; time: Date | null }[];
};

export type TravelError = 'required' | 'place' | 'time' | 'pickup' | 'invalid';

type SavedPlace = PlaceSnapshot & { id: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function parsePoint(v: unknown): GeoPoint | null {
	if (!isObj(v)) return null;
	const { name, address, area, lat, lon } = v;
	if (
		typeof address !== 'string' ||
		!address.trim() ||
		address.length > 300 ||
		typeof area !== 'string' ||
		!area.trim() ||
		area.length > 120 ||
		typeof lat !== 'number' ||
		typeof lon !== 'number' ||
		!Number.isFinite(lat) ||
		!Number.isFinite(lon) ||
		Math.abs(lat) > 90 ||
		Math.abs(lon) > 180
	)
		return null;
	const short = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : area;
	return { name: short, address: address.trim(), area: area.trim(), lat, lon };
}

/**
 * Validates the travel field (sent as JSON). Saved places are resolved against the user's own
 * places and copied; custom places marked `save` are returned so they can be added to the profile.
 */
export function parseTravel(
	raw: unknown,
	opts: {
		directions: TravelDirection[];
		required: boolean;
		timezone: string;
		savedPlaces: SavedPlace[];
	}
):
	| { ok: true; legs: ParsedLeg[]; placesToSave: PlaceSnapshot[] }
	| { ok: false; errors: Partial<Record<TravelDirection, TravelError>> } {
	const input = isObj(raw) ? raw : {};
	const legs: ParsedLeg[] = [];
	const placesToSave: PlaceSnapshot[] = [];
	const errors: Partial<Record<TravelDirection, TravelError>> = {};

	for (const direction of opts.directions) {
		const leg = input[direction];
		const mode = isObj(leg) ? (leg.mode as TravelMode | null) : null;
		if (!mode) {
			if (opts.required) errors[direction] = 'required';
			continue;
		}
		if (!isObj(leg) || !TRAVEL_MODES.includes(mode)) {
			errors[direction] = 'invalid';
			continue;
		}

		// When
		// "2027-07-16T14:00", or just "2027-07-16" when only the day is known
		let time: Date | null = null;
		let hasClock = true;
		if (typeof leg.time === 'string' && leg.time) {
			hasClock = leg.time.length > 10;
			time = zonedToUtc(hasClock ? leg.time : `${leg.time}T12:00`, opts.timezone);
			if (!time) {
				errors[direction] = 'time';
				continue;
			}
		}

		// Where from / to
		let place: PlaceSnapshot | null = null;
		const choice = leg.place;
		if (isObj(choice) && choice.kind === 'saved') {
			const saved = opts.savedPlaces.find((p) => p.id === choice.id);
			if (!saved) {
				errors[direction] = 'place';
				continue;
			}
			place = {
				label: saved.label,
				address: saved.address,
				area: saved.area,
				lat: saved.lat,
				lon: saved.lon
			};
		} else if (isObj(choice) && choice.kind === 'custom') {
			const point = parsePoint(choice.point);
			const label = typeof choice.label === 'string' ? choice.label.trim().slice(0, 40) : '';
			if (point) {
				place = {
					label: label || point.name,
					address: point.address,
					area: point.area,
					lat: point.lat,
					lon: point.lon
				};
				if (choice.save === true && label) placesToSave.push(place);
			} else if (choice.point) {
				// something was sent, but not a valid search result
				errors[direction] = 'place';
				continue;
			}
			// nothing picked from the search = no place (fine for public transport, see below)
		}
		// Car status (first: if nobody can come along, where from doesn't matter for rides)
		const carStatus =
			mode === 'car'
				? CAR_STATUSES.includes(leg.carStatus as CarStatus)
					? (leg.carStatus as CarStatus)
					: 'offering'
				: null;
		// Drivers who take people along must say where they start – matching is based on it.
		if (!place && mode === 'car' && carStatus === 'offering') {
			errors[direction] = 'place';
			continue;
		}

		const carNote =
			mode === 'car' && typeof leg.carNote === 'string'
				? leg.carNote.trim().slice(0, CAR_NOTE_MAX)
				: '';

		// Where to be picked up / dropped off: home, a station, … – several alternatives allowed.
		// ("transit" is the older mode for station pick-ups and still accepted.)
		const pickups: ParsedLeg['pickups'] = [];
		if ((mode === 'seeking' || mode === 'transit') && Array.isArray(leg.pickups)) {
			if (leg.pickups.length > MAX_PICKUPS) {
				errors[direction] = 'pickup';
				continue;
			}
			let bad = false;
			for (const p of leg.pickups) {
				const saved =
					isObj(p) && typeof p.savedId === 'string'
						? opts.savedPlaces.find((sp) => sp.id === p.savedId)
						: undefined;
				const point = saved
					? {
							name: saved.label,
							address: saved.address,
							area: saved.area,
							lat: saved.lat,
							lon: saved.lon
						}
					: isObj(p)
						? parsePoint(p.point)
						: null;
				const t =
					isObj(p) && typeof p.time === 'string' && p.time
						? zonedToUtc(p.time, opts.timezone)
						: null;
				if (!point || (isObj(p) && typeof p.time === 'string' && p.time && !t)) {
					bad = true;
					break;
				}
				pickups.push({
					label: point.name,
					area: point.area,
					lat: point.lat,
					lon: point.lon,
					time: t
				});
			}
			if (bad) {
				errors[direction] = 'pickup';
				continue;
			}
		}
		// Looking for a ride: say where you can be picked up (older registrations used `place`).
		if (mode === 'seeking' && pickups.length === 0 && !place) {
			errors[direction] = 'pickup';
			continue;
		}

		legs.push({ direction, mode, time, hasClock, place, carStatus, carNote, pickups });
	}

	return Object.keys(errors).length ? { ok: false, errors } : { ok: true, legs, placesToSave };
}
