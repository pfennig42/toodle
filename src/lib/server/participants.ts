/** Organizer view of all registrations of an event (docs/konzept.md 4.6). */
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { ContactKind } from '../contacts.js';
import type { TravelDirection } from '../forms.js';
import type { AnswerValue, CarStatus, TravelMode } from '../registration.js';
import { db } from './db/index.js';
import {
	answer,
	contact,
	pickupOption,
	registration,
	rideLink,
	travelLeg,
	user
} from './db/schema.js';
import { cleanupRideLinks } from './rides.js';

export type OrgaLeg = {
	direction: TravelDirection;
	mode: TravelMode;
	time: Date | null;
	placeLabel: string | null;
	placeArea: string | null;
	lat: number | null;
	lon: number | null;
	carStatus: CarStatus | null;
	carNote: string;
	pickups: { label: string; area: string; time: Date | null }[];
	/** name of the driver this person rides with (soft signal) */
	ridesWith: string | null;
	/** names of passengers when driving */
	passengers: string[];
};

export type OrgaParticipant = {
	registrationId: string;
	userId: string;
	name: string;
	email: string;
	status: 'active' | 'withdrawn';
	comment: string;
	createdAt: Date;
	updatedAt: Date;
	contacts: { kind: ContactKind; value: string }[];
	answers: Record<string, AnswerValue>;
	legs: OrgaLeg[];
};

/** All registrations (active and withdrawn) with answers, travel and ride links. */
export function listParticipants(eventId: string): OrgaParticipant[] {
	const regs = db
		.select({
			id: registration.id,
			userId: user.id,
			name: user.name,
			email: user.email,
			status: registration.status,
			comment: registration.comment,
			createdAt: registration.createdAt,
			updatedAt: registration.updatedAt
		})
		.from(registration)
		.innerJoin(user, eq(user.id, registration.userId))
		.where(eq(registration.eventId, eventId))
		.orderBy(asc(registration.createdAt))
		.all();
	if (!regs.length) return [];

	const regIds = regs.map((r) => r.id);
	const answers = db.select().from(answer).where(inArray(answer.registrationId, regIds)).all();
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
				.orderBy(asc(pickupOption.position))
				.all()
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
		.orderBy(asc(contact.createdAt))
		.all();
	const active = new Set(regs.filter((r) => r.status === 'active').map((r) => r.id));
	const links = db
		.select()
		.from(rideLink)
		.where(eq(rideLink.eventId, eventId))
		.all()
		.filter((l) => active.has(l.driverRegistrationId) && active.has(l.passengerRegistrationId));

	const displayName = (r: { name: string | null; email: string }) =>
		r.name ?? r.email.split('@')[0];
	const nameOf = new Map(regs.map((r) => [r.id, displayName(r)]));

	return regs.map((r) => ({
		registrationId: r.id,
		userId: r.userId,
		name: displayName(r),
		email: r.email,
		status: r.status,
		comment: r.comment,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		contacts: contacts
			.filter((c) => c.userId === r.userId)
			.map(({ kind, value }) => ({ kind, value })),
		answers: Object.fromEntries(
			answers.filter((a) => a.registrationId === r.id).map((a) => [a.fieldId, a.value])
		),
		legs: legs
			.filter((l) => l.registrationId === r.id)
			.sort((a, b) => (a.direction === b.direction ? 0 : a.direction === 'to' ? -1 : 1))
			.map((l) => {
				const ridesWith = links.find(
					(k) => k.passengerRegistrationId === r.id && k.direction === l.direction
				);
				return {
					direction: l.direction,
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
						.map(({ label, area, time }) => ({ label, area, time })),
					ridesWith: ridesWith ? (nameOf.get(ridesWith.driverRegistrationId) ?? null) : null,
					passengers: links
						.filter((k) => k.driverRegistrationId === r.id && k.direction === l.direction)
						.map((k) => nameOf.get(k.passengerRegistrationId) ?? '?')
				};
			})
	}));
}

function setStatus(eventId: string, registrationId: string, status: 'active' | 'withdrawn') {
	const res = db
		.update(registration)
		.set({ status, updatedAt: new Date() })
		.where(and(eq(registration.id, registrationId), eq(registration.eventId, eventId)))
		.run();
	if (status === 'withdrawn') cleanupRideLinks(eventId);
	return res.changes > 0;
}

/** Organizer removes someone (reversible – the registration is kept as withdrawn). */
export const withdrawByOrganizer = (eventId: string, registrationId: string) =>
	setStatus(eventId, registrationId, 'withdrawn');

export const reactivateByOrganizer = (eventId: string, registrationId: string) =>
	setStatus(eventId, registrationId, 'active');

/** Deletes a withdrawn registration for good (answers and travel data go with it). */
export function deleteWithdrawn(eventId: string, registrationId: string): boolean {
	const res = db
		.delete(registration)
		.where(
			and(
				eq(registration.id, registrationId),
				eq(registration.eventId, eventId),
				eq(registration.status, 'withdrawn')
			)
		)
		.run();
	return res.changes > 0;
}
