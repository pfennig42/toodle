/**
 * Who sees the rides of an event (organizers always see everything):
 * - public: every registered participant sees every ride
 * - matched: participants only see rides that fit their own trip
 * - internal: participants only see their own trip and whom the organizers put them with
 */
export const RIDE_VISIBILITIES = ['public', 'matched', 'internal'] as const;
export type RideVisibility = (typeof RIDE_VISIBILITIES)[number];

/** From this many people on, "public" is a lot of exposure – the forms suggest "matched". */
export const LARGE_EVENT = 100;

export const isRideVisibility = (v: unknown): v is RideVisibility =>
	RIDE_VISIBILITIES.includes(v as RideVisibility);

/** Making rides visible to more people than before (after people registered under other terms). */
export const widensVisibility = (from: RideVisibility, to: RideVisibility) =>
	RIDE_VISIBILITIES.indexOf(to) < RIDE_VISIBILITIES.indexOf(from);
