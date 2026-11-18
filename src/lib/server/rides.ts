import { and, eq, inArray } from 'drizzle-orm';
import type { TravelDirection } from '../forms.js';
import { db } from './db/index.js';
import { contact, pickupOption, registration, rideLink, travelLeg, user } from './db/schema.js';
import { staleLinks, type Link, type Participant } from './ride-matching.js';

/** All active participants of an event with their legs and contact options. */
export function loadRideData(eventId: string): { participants: Participant[]; links: Link[] } {
	const regs = db
		.select({ id: registration.id, userId: user.id, name: user.name, email: user.email })
		.from(registration)
		.innerJoin(user, eq(user.id, registration.userId))
		.where(and(eq(registration.eventId, eventId), eq(registration.status, 'active')))
		.all();
	if (!regs.length) return { participants: [], links: [] };

	const regIds = regs.map((r) => r.id);
	const legs = db.select().from(travelLeg).where(inArray(travelLeg.registrationId, regIds)).all();
	const pickups = legs.length
		? db
				.select()
				.from(pickupOption)
				.where(
					inArray(
						pickupOption.legId,
						legs.map((l) => l.id)
					)
				)
				.all()
				.sort((a, b) => a.position - b.position)
		: [];
	const contacts = db
		.select()
		.from(contact)
		.where(
			inArray(
				contact.userId,
				regs.map((r) => r.userId)
			)
		)
		.all();

	const participants: Participant[] = regs.map((r) => ({
		registrationId: r.id,
		userId: r.userId,
		name: r.name ?? r.email.split('@')[0],
		contacts: contacts
			.filter((c) => c.userId === r.userId)
			.map(({ kind, value, label }) => ({ kind, value, label })),
		legs: Object.fromEntries(
			legs
				.filter((l) => l.registrationId === r.id)
				.map((l) => [
					l.direction,
					{
						mode: l.mode,
						time: l.time,
						placeLabel: l.placeLabel,
						placeArea: l.placeArea,
						lat: l.lat,
						lon: l.lon,
						carStatus: l.carStatus,
						carNote: l.carNote,
						pickups: pickups
							.filter((p) => p.legId === l.id)
							.map(({ label, area, lat, lon, time }) => ({ label, area, lat, lon, time }))
					}
				])
		)
	}));

	const active = new Set(regIds);
	const links = db
		.select()
		.from(rideLink)
		.where(eq(rideLink.eventId, eventId))
		.all()
		.filter((l) => active.has(l.driverRegistrationId) && active.has(l.passengerRegistrationId));

	return { participants, links };
}

/** Connects passenger and driver (replacing an earlier driver of that passenger). */
export function linkRide(
	eventId: string,
	direction: TravelDirection,
	driverRegistrationId: string,
	passengerRegistrationId: string,
	createdBy: string
) {
	db.transaction(() => {
		db.delete(rideLink)
			.where(
				and(
					eq(rideLink.passengerRegistrationId, passengerRegistrationId),
					eq(rideLink.direction, direction)
				)
			)
			.run();
		db.insert(rideLink)
			.values({ eventId, direction, driverRegistrationId, passengerRegistrationId, createdBy })
			.run();
	});
}

export function getLink(eventId: string, linkId: string) {
	return (
		db
			.select()
			.from(rideLink)
			.where(and(eq(rideLink.id, linkId), eq(rideLink.eventId, eventId)))
			.get() ?? null
	);
}

export function unlinkRide(linkId: string) {
	db.delete(rideLink).where(eq(rideLink.id, linkId)).run();
}

/** Removes links that no longer fit (call after registrations changed). */
export function cleanupRideLinks(eventId: string) {
	const { participants } = loadRideData(eventId);
	const all = db.select().from(rideLink).where(eq(rideLink.eventId, eventId)).all();
	const active = new Set(participants.map((p) => p.registrationId));
	const dead = [
		...all.filter(
			(l) => !active.has(l.driverRegistrationId) || !active.has(l.passengerRegistrationId)
		),
		...staleLinks(participants, all)
	];
	if (dead.length) {
		db.delete(rideLink)
			.where(
				inArray(
					rideLink.id,
					dead.map((l) => l.id)
				)
			)
			.run();
	}
}
