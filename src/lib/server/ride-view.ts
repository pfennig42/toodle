import type {
	DirectionView,
	DriverEntry,
	PersonRef,
	RideLeg,
	SeekerEntry
} from './ride-matching.js';

/** What the browser gets: no coordinates, no addresses – only areas and station names. */
export function publicLeg(leg: RideLeg) {
	return {
		mode: leg.mode,
		time: leg.time,
		hasClock: leg.hasClock,
		placeArea: leg.placeArea,
		carStatus: leg.carStatus,
		carNote: leg.carNote,
		pickups: leg.pickups.map((p) => ({ label: p.label, time: p.time }))
	};
}

export type PublicLeg = ReturnType<typeof publicLeg>;

const person = (p: PersonRef) => ({
	registrationId: p.registrationId,
	name: p.name,
	contacts: p.contacts
});

const match = (m: DriverEntry['match']) =>
	m && {
		detourMin: m.detourMin,
		via: m.via.isPickup ? m.via.label : null,
		timeGapMin: m.timeGapMin
	};

export function publicView(v: DirectionView) {
	return {
		role: v.role,
		myLeg: v.myLeg && publicLeg(v.myLeg),
		myDriver: v.myDriver && person(v.myDriver),
		myPassengers: v.myPassengers.map(person),
		drivers: v.drivers.map((d: DriverEntry) => ({
			...person(d),
			leg: publicLeg(d.leg),
			passengers: d.passengers.map((p) => ({ registrationId: p.registrationId, name: p.name })),
			match: match(d.match)
		})),
		seekers: v.seekers.map((s: SeekerEntry) => ({
			...person(s),
			leg: publicLeg(s.leg),
			driver: s.driver && { registrationId: s.driver.registrationId, name: s.driver.name },
			match: match(s.match),
			distanceKm: s.distanceKm
		}))
	};
}

export type PublicView = ReturnType<typeof publicView>;
