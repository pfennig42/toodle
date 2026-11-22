/** Shared types for registrations (client form ↔ server). See docs/konzept.md 4.4. */
import type { TravelDirection } from './forms.js';

export const TRAVEL_MODES = ['car', 'flexible', 'transit', 'seeking', 'undecided'] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const CAR_STATUSES = ['offering', 'full', 'not_offering'] as const;
export type CarStatus = (typeof CAR_STATUSES)[number];

export type AnswerValue = string | number | boolean | string[];

export const MAX_PICKUPS = 5;
export const COMMENT_MAX = 2000;
export const CAR_NOTE_MAX = 200;

export type GeoPoint = {
	name: string;
	address: string;
	area: string;
	lat: number;
	lon: number;
	/** `name` may be shown to others (station, venue) – false for plain addresses */
	shareName?: boolean;
};

/** Where a leg starts (arrival) or ends (departure) – as sent by the registration form. */
export type PlaceChoice =
	| { kind: 'saved'; id: string }
	| { kind: 'custom'; label: string; point: GeoPoint | null; save: boolean };

/**
 * Where someone can be picked up (arrival) or dropped off (departure): a saved place
 * ("Zuhause") or any address/station from the search. `time`: "2027-07-16T16:40" or "".
 */
export type PickupInput = { point: GeoPoint | null; savedId?: string; time: string };

/**
 * Modes offered in the form, once someone wants to coordinate a ride (otherwise: "undecided").
 * "transit" is only kept for older registrations.
 */
export const FORM_MODES = ['seeking', 'car', 'flexible'] as const;

/** Modes that come with a car and a start place: "car" and "flexible" (drives or rides along). */
export const drivesMaybe = (mode: TravelMode | null | undefined) =>
	mode === 'car' || mode === 'flexible';

export type LegInput = {
	mode: TravelMode | null;
	time: string;
	place: PlaceChoice | null;
	carStatus: CarStatus;
	carNote: string;
	pickups: PickupInput[];
};

export type TravelInput = Partial<Record<TravelDirection, LegInput>>;
