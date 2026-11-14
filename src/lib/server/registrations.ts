import { and, asc, eq, inArray, ne, count } from 'drizzle-orm';
import type { AnswerValue } from '../registration.js';
import { db } from './db/index.js';
import { answer, event, pickupOption, registration, travelLeg, type Event } from './db/schema.js';
import { addPlace, listPlaces } from './profile.js';
import type { ParsedLeg, PlaceSnapshot } from './registration-rules.js';

export function getRegistration(eventId: string, userId: string) {
	const reg = db
		.select()
		.from(registration)
		.where(and(eq(registration.eventId, eventId), eq(registration.userId, userId)))
		.get();
	if (!reg) return null;
	const answers = db.select().from(answer).where(eq(answer.registrationId, reg.id)).all();
	const legs = db.select().from(travelLeg).where(eq(travelLeg.registrationId, reg.id)).all();
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
	return {
		...reg,
		answers: Object.fromEntries(answers.map((a) => [a.fieldId, a.value])) as Record<
			string,
			AnswerValue
		>,
		legs: legs.map((l) => ({ ...l, pickups: pickups.filter((p) => p.legId === l.id) }))
	};
}

export type FullRegistration = NonNullable<ReturnType<typeof getRegistration>>;

export function countActiveRegistrations(eventId: string, excludeUserId?: string): number {
	return (
		db
			.select({ n: count() })
			.from(registration)
			.where(
				and(
					eq(registration.eventId, eventId),
					eq(registration.status, 'active'),
					excludeUserId ? ne(registration.userId, excludeUserId) : undefined
				)
			)
			.get()?.n ?? 0
	);
}

export function isFull(e: Event, userId: string): boolean {
	return e.capacity !== null && countActiveRegistrations(e.id, userId) >= e.capacity;
}

/**
 * Creates or updates the user's registration. `answersLocked` keeps form answers untouched
 * (after the deadline only travel details and the comment may change).
 */
export function saveRegistration(input: {
	eventId: string;
	userId: string;
	comment: string;
	answers: Map<string, AnswerValue> | null;
	legs: ParsedLeg[];
	placesToSave: PlaceSnapshot[];
}) {
	db.transaction(() => {
		const now = new Date();
		let reg = db
			.select()
			.from(registration)
			.where(and(eq(registration.eventId, input.eventId), eq(registration.userId, input.userId)))
			.get();
		if (reg) {
			db.update(registration)
				.set({ status: 'active', comment: input.comment, updatedAt: now })
				.where(eq(registration.id, reg.id))
				.run();
		} else {
			reg = db
				.insert(registration)
				.values({ eventId: input.eventId, userId: input.userId, comment: input.comment })
				.returning()
				.get();
		}

		if (input.answers) {
			db.delete(answer).where(eq(answer.registrationId, reg.id)).run();
			for (const [fieldId, value] of input.answers) {
				db.insert(answer).values({ registrationId: reg.id, fieldId, value }).run();
			}
		}

		db.delete(travelLeg).where(eq(travelLeg.registrationId, reg.id)).run(); // cascades pickups
		for (const leg of input.legs) {
			const created = db
				.insert(travelLeg)
				.values({
					registrationId: reg.id,
					direction: leg.direction,
					mode: leg.mode,
					time: leg.time,
					placeLabel: leg.place?.label ?? null,
					placeAddress: leg.place?.address ?? null,
					placeArea: leg.place?.area ?? null,
					lat: leg.place?.lat ?? null,
					lon: leg.place?.lon ?? null,
					carStatus: leg.carStatus,
					carNote: leg.carNote
				})
				.returning()
				.get();
			leg.pickups.forEach((p, position) =>
				db
					.insert(pickupOption)
					.values({ legId: created.id, position, ...p })
					.run()
			);
		}

		// Saved places from the travel form – skip ones the profile already has.
		const known = listPlaces(input.userId);
		for (const p of input.placesToSave) {
			if (!known.some((k) => k.address === p.address)) addPlace(input.userId, p);
		}
	});
}

export function withdrawRegistration(eventId: string, userId: string) {
	db.update(registration)
		.set({ status: 'withdrawn', updatedAt: new Date() })
		.where(and(eq(registration.eventId, eventId), eq(registration.userId, userId)))
		.run();
}

/** Events the user is (actively) registered for – for the dashboard. */
export function listRegistrationsForUser(userId: string) {
	return db
		.select({ event })
		.from(registration)
		.innerJoin(event, eq(event.id, registration.eventId))
		.where(and(eq(registration.userId, userId), eq(registration.status, 'active')))
		.orderBy(asc(event.startsAt))
		.all()
		.map((r) => r.event);
}
