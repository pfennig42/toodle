/**
 * Ride matching – deliberately simple: straight-line distances with a road factor, no routing.
 * It only sorts and annotates; people still arrange rides themselves (docs/konzept.md 4.5).
 */
import type { ContactKind } from '../contacts.js';
import type { TravelDirection } from '../forms.js';
import type { CarStatus, TravelMode } from '../registration.js';
import type { RideVisibility } from '../ride-visibility.js';

export const ROAD_FACTOR = 1.3;
export const AVG_SPEED_KMH = 60;
/** Detours up to this many minutes count as "on the way". */
export const GOOD_DETOUR_MIN = 20;
/** Time differences up to this many minutes count as "fits". */
export const TIME_TOLERANCE_MIN = 45;

export type Point = { lat: number; lon: number };

export type RideLeg = {
	mode: TravelMode;
	time: Date | null;
	placeLabel: string | null;
	placeArea: string | null;
	lat: number | null;
	lon: number | null;
	carStatus: CarStatus | null;
	carNote: string;
	pickups: { label: string; area: string; lat: number; lon: number; time: Date | null }[];
};

export type Participant = {
	registrationId: string;
	userId: string;
	name: string;
	contacts: { kind: ContactKind; value: string }[];
	legs: Partial<Record<TravelDirection, RideLeg>>;
};

export type Link = {
	id: string;
	direction: TravelDirection;
	driverRegistrationId: string;
	passengerRegistrationId: string;
};

/* ------------------------------------------------------------------ geometry */

export function distanceKm(a: Point, b: Point): number {
	const R = 6371;
	const rad = (d: number) => (d * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLon = rad(b.lon - a.lon);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimated driving minutes for a straight-line distance. */
export const driveMinutes = (km: number) => (km * ROAD_FACTOR * 60) / AVG_SPEED_KMH;

/**
 * Driving time in minutes between two points. Straight-line estimate by default; with a
 * routing server configured (ROUTING_URL) real driving times are passed in instead.
 */
export type TravelTime = (a: Point, b: Point) => number;

export const straightLine: TravelTime = (a, b) => driveMinutes(distanceKm(a, b));

/**
 * Extra minutes for a driver going home ↔ event via `stop`. Symmetric, so it works for
 * both directions (to: home → stop → event, from: event → stop → home).
 */
export function detourMinutes(
	driverPlace: Point,
	stop: Point,
	eventPoint: Point,
	travel: TravelTime = straightLine
): number {
	const extra =
		travel(driverPlace, stop) + travel(stop, eventPoint) - travel(driverPlace, eventPoint);
	return Math.max(0, extra);
}

/* ------------------------------------------------------------------- roles */

const hasPoint = (leg: RideLeg | undefined): leg is RideLeg & { lat: number; lon: number } =>
	!!leg && leg.lat !== null && leg.lon !== null;

export const isDriver = (leg: RideLeg | undefined) => !!leg && leg.mode === 'car' && hasPoint(leg);

/**
 * Seekers: looking for a ride – picked up at home, at a station, … (pick-up points), or from
 * their place (older registrations); "transit" with pick-up wishes is the older form of it.
 */
export const isSeeker = (leg: RideLeg | undefined) =>
	!!leg &&
	((leg.mode === 'seeking' && (leg.pickups.length > 0 || hasPoint(leg))) ||
		(leg.mode === 'transit' && leg.pickups.length > 0));

export type SearchPoint = Point & { label: string; time: Date | null; isPickup: boolean };

/** Points where a seeker could be picked up (arrival) or dropped off (departure). */
export function searchPoints(leg: RideLeg | undefined): SearchPoint[] {
	if (!leg) return [];
	if (leg.pickups.length > 0 || leg.mode === 'transit') {
		return leg.pickups.map((p) => ({
			lat: p.lat,
			lon: p.lon,
			label: p.label,
			time: p.time,
			isPickup: true
		}));
	}
	if (hasPoint(leg)) {
		return [
			{ lat: leg.lat, lon: leg.lon, label: leg.placeArea ?? '', time: leg.time, isPickup: false }
		];
	}
	return [];
}

export type Match = {
	detourMin: number;
	/** The seeker's point that suits this driver best */
	via: SearchPoint;
	/** driver's estimated time at the point minus the seeker's time (minutes), null if unknown */
	timeGapMin: number | null;
};

/** Best of the seeker's alternatives for one driver. */
export function bestMatch(
	driverLeg: RideLeg,
	points: SearchPoint[],
	eventPoint: Point,
	direction: TravelDirection,
	travel: TravelTime = straightLine
): Match | null {
	if (!hasPoint(driverLeg) || points.length === 0) return null;
	const home: Point = { lat: driverLeg.lat, lon: driverLeg.lon };
	let best: Match | null = null;
	for (const via of points) {
		const detourMin = detourMinutes(home, via, eventPoint, travel);
		let timeGapMin: number | null = null;
		if (driverLeg.time && via.time) {
			// When would the driver be at this point? Pick-ups: on the way; otherwise compare departures.
			const offset = via.isPickup ? travel(direction === 'to' ? home : eventPoint, via) : 0;
			timeGapMin = Math.round((driverLeg.time.getTime() - via.time.getTime()) / 60000 + offset);
		}
		const score = detourMin + (timeGapMin === null ? 0 : Math.min(Math.abs(timeGapMin), 180) / 4);
		const bestScore = best
			? best.detourMin +
				(best.timeGapMin === null ? 0 : Math.min(Math.abs(best.timeGapMin), 180) / 4)
			: Infinity;
		if (score < bestScore) best = { detourMin: Math.round(detourMin), via, timeGapMin };
	}
	return best;
}

export const timeFits = (m: Match | null) =>
	!m || m.timeGapMin === null || Math.abs(m.timeGapMin) <= TIME_TOLERANCE_MIN;

/** On the way and at a fitting time – what hint mails announce and "matched" events show. */
export const isGoodMatch = (m: Match | null): m is Match =>
	!!m && m.detourMin <= GOOD_DETOUR_MIN && timeFits(m);

/* --------------------------------------------------------------------- views */

export type PersonRef = Pick<Participant, 'registrationId' | 'name' | 'contacts'>;

export type DriverEntry = PersonRef & {
	leg: RideLeg;
	passengers: PersonRef[];
	/** Relative to the viewer (if the viewer is looking for a ride) */
	match: Match | null;
};

export type SeekerEntry = PersonRef & {
	leg: RideLeg;
	driver: PersonRef | null;
	/** Relative to the viewer (if the viewer drives) */
	match: Match | null;
	/** Straight-line km to the viewer's own point (seekers looking at other seekers) */
	distanceKm: number | null;
};

export type ViewerRole = 'driver' | 'seeker' | 'other';

export type DirectionView = {
	role: ViewerRole;
	myLeg: RideLeg | null;
	myDriver: PersonRef | null;
	myPassengers: PersonRef[];
	drivers: DriverEntry[];
	seekers: SeekerEntry[];
};

const ref = (p: Participant): PersonRef => ({
	registrationId: p.registrationId,
	name: p.name,
	contacts: p.contacts
});

const statusRank: Record<CarStatus, number> = { offering: 0, full: 1, not_offering: 2 };

/**
 * Everything one participant sees for one direction. `viewerId` may be null for organizers
 * who are not registered themselves – they get the unsorted overview.
 */
export function buildDirectionView(
	participants: Participant[],
	links: Link[],
	viewerId: string | null,
	direction: TravelDirection,
	eventPoint: Point,
	travel: TravelTime = straightLine
): DirectionView {
	const byId = new Map(participants.map((p) => [p.registrationId, p]));
	const dirLinks = links.filter((l) => l.direction === direction);
	const driverOf = new Map(
		dirLinks.map((l) => [l.passengerRegistrationId, l.driverRegistrationId])
	);
	const me = viewerId ? byId.get(viewerId) : undefined;
	const myLeg = me?.legs[direction] ?? null;
	const role: ViewerRole = isDriver(myLeg ?? undefined)
		? 'driver'
		: isSeeker(myLeg ?? undefined)
			? 'seeker'
			: 'other';

	// Viewers who don't drive still see drivers sorted by detour from wherever they start.
	const myPoints = role === 'driver' ? [] : searchPoints(myLeg ?? undefined);

	const drivers: DriverEntry[] = participants
		.filter((p) => p.registrationId !== viewerId && isDriver(p.legs[direction]))
		.map((p) => {
			const leg = p.legs[direction]!;
			return {
				...ref(p),
				leg,
				passengers: dirLinks
					.filter((l) => l.driverRegistrationId === p.registrationId)
					.map((l) => byId.get(l.passengerRegistrationId))
					.filter((x): x is Participant => !!x)
					.map(ref),
				match: myPoints.length ? bestMatch(leg, myPoints, eventPoint, direction, travel) : null
			};
		})
		.sort(
			(a, b) =>
				statusRank[a.leg.carStatus ?? 'offering'] - statusRank[b.leg.carStatus ?? 'offering'] ||
				(a.match?.detourMin ?? Infinity) - (b.match?.detourMin ?? Infinity) ||
				a.name.localeCompare(b.name)
		);

	const mine = myPoints[0] ?? null;
	const seekers: SeekerEntry[] = participants
		.filter((p) => p.registrationId !== viewerId && isSeeker(p.legs[direction]))
		.map((p) => {
			const leg = p.legs[direction]!;
			const driverId = driverOf.get(p.registrationId);
			const driver = driverId ? byId.get(driverId) : undefined;
			const pts = searchPoints(leg);
			return {
				...ref(p),
				leg,
				driver: driver ? ref(driver) : null,
				match:
					role === 'driver' && myLeg ? bestMatch(myLeg, pts, eventPoint, direction, travel) : null,
				distanceKm:
					mine && pts.length ? Math.round(Math.min(...pts.map((x) => distanceKm(mine, x)))) : null
			};
		})
		.sort(
			(a, b) =>
				Number(!!a.driver) - Number(!!b.driver) ||
				(a.match?.detourMin ?? a.distanceKm ?? Infinity) -
					(b.match?.detourMin ?? b.distanceKm ?? Infinity) ||
				a.name.localeCompare(b.name)
		);

	const myDriverId = viewerId ? driverOf.get(viewerId) : undefined;
	const myDriver = myDriverId ? byId.get(myDriverId) : undefined;

	return {
		role,
		myLeg,
		myDriver: myDriver ? ref(myDriver) : null,
		myPassengers: dirLinks
			.filter((l) => l.driverRegistrationId === viewerId)
			.map((l) => byId.get(l.passengerRegistrationId))
			.filter((x): x is Participant => !!x)
			.map(ref),
		drivers,
		seekers
	};
}

/* --------------------------------------------------------------- visibility */

/** "matched" events show at most this many people per list – the best fits. */
export const MATCHED_LIMIT = 8;

export type RestrictedView = DirectionView & {
	/** People left out of the lists (the participant only learns how many) */
	hidden: { drivers: number; seekers: number };
};

/**
 * What a participant may see of a direction view (docs/konzept.md 4.5, "Sichtbarkeit"). Organizers see
 * everything, so they get `public`. The viewer's own trip and links always stay.
 */
export function restrictView(v: DirectionView, visibility: RideVisibility): RestrictedView {
	let drivers = v.drivers;
	let seekers = v.seekers;
	if (visibility === 'internal') {
		drivers = [];
		seekers = [];
	} else if (visibility === 'matched') {
		const myDriverId = v.myDriver?.registrationId;
		const mine = new Set(v.myPassengers.map((p) => p.registrationId));
		// Seekers see drivers who could take them, drivers see seekers on their way – nobody else.
		drivers =
			v.role === 'driver'
				? []
				: v.drivers
						.filter(
							(d) =>
								d.registrationId === myDriverId ||
								(d.leg.carStatus === 'offering' && isGoodMatch(d.match))
						)
						.slice(0, MATCHED_LIMIT);
		seekers =
			v.role === 'driver'
				? v.seekers
						.filter((s) => mine.has(s.registrationId) || (!s.driver && isGoodMatch(s.match)))
						.slice(0, MATCHED_LIMIT)
				: [];
		// Who rides with whom is nobody else's business here.
		drivers = drivers.map((d) => ({
			...d,
			passengers: d.registrationId === myDriverId ? d.passengers : []
		}));
	}
	return {
		...v,
		drivers,
		seekers,
		hidden: {
			drivers: v.drivers.length - drivers.length,
			seekers: v.seekers.length - seekers.length
		}
	};
}

/* ------------------------------------------------------------- permissions */

export type LinkActor = { registrationId: string | null; isOrganizer: boolean };

/**
 * Who may connect a passenger with a driver:
 * - the passenger ("I ride with …") unless the car is full / not taking anyone,
 * - the driver ("I take …"),
 * - organizers, always.
 * The visibility of the event is checked separately (`linkVisible`).
 */
export function canLink(
	actor: LinkActor,
	driver: Participant | undefined,
	passenger: Participant | undefined,
	direction: TravelDirection
): boolean {
	if (!driver || !passenger || driver.registrationId === passenger.registrationId) return false;
	const dLeg = driver.legs[direction];
	const pLeg = passenger.legs[direction];
	if (!isDriver(dLeg) || !pLeg || pLeg.mode === 'car') return false;
	if (actor.isOrganizer) return true;
	if (actor.registrationId === driver.registrationId) return true;
	if (actor.registrationId === passenger.registrationId) return dLeg!.carStatus === 'offering';
	return false;
}

/**
 * Participants can only connect with people they are allowed to see: nobody in "internal"
 * events (the organizers do it), only shown matches in "matched" events.
 * `view` is the actor's own, already restricted view.
 */
export function linkVisible(
	actor: LinkActor,
	visibility: RideVisibility,
	view: RestrictedView | null,
	driverId: string,
	passengerId: string
): boolean {
	if (actor.isOrganizer || visibility === 'public') return true;
	if (visibility === 'internal' || !view) return false;
	if (actor.registrationId === passengerId)
		return view.drivers.some((d) => d.registrationId === driverId);
	if (actor.registrationId === driverId)
		return view.seekers.some((s) => s.registrationId === passengerId);
	return false;
}

export function canUnlink(actor: LinkActor, link: Link): boolean {
	return (
		actor.isOrganizer ||
		actor.registrationId === link.driverRegistrationId ||
		actor.registrationId === link.passengerRegistrationId
	);
}

/** Links that no longer make sense after a registration changed (e.g. driver now takes the train). */
export function staleLinks(participants: Participant[], links: Link[]): Link[] {
	const byId = new Map(participants.map((p) => [p.registrationId, p]));
	return links.filter((l) => {
		const d = byId.get(l.driverRegistrationId)?.legs[l.direction];
		const p = byId.get(l.passengerRegistrationId)?.legs[l.direction];
		return !isDriver(d) || !p || p.mode === 'car';
	});
}
