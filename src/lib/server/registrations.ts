import { and, asc, eq, inArray, ne, count } from 'drizzle-orm';
import { addLocalDays } from '../datetime.js';
import type { TravelDirection } from '../forms.js';
import type { AnswerValue } from '../registration.js';
import { db } from './db/index.js';
import { answer, event, pickupOption, registration, travelLeg, type Event } from './db/schema.js';
import { addPlace, listPlaces } from './profile.js';
import { cleanupRideLinks } from './rides.js';
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

export function getRegistrationById(eventId: string, registrationId: string) {
	return (
		db
			.select()
			.from(registration)
			.where(and(eq(registration.id, registrationId), eq(registration.eventId, eventId)))
			.get() ?? null
	);
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
	/** 'waitlisted' when the event is full (the place in the queue is kept on later edits) */
	status?: 'active' | 'waitlisted';
}) {
	db.transaction(() => {
		const now = new Date();
		const status = input.status ?? 'active';
		let reg = db
			.select()
			.from(registration)
			.where(and(eq(registration.eventId, input.eventId), eq(registration.userId, input.userId)))
			.get();
		const queuedAt =
			status === 'waitlisted' ? (reg?.status === 'waitlisted' ? reg.queuedAt : now) : null;
		if (reg) {
			db.update(registration)
				.set({ status, queuedAt, comment: input.comment, updatedAt: now })
				.where(eq(registration.id, reg.id))
				.run();
		} else {
			reg = db
				.insert(registration)
				.values({
					eventId: input.eventId,
					userId: input.userId,
					comment: input.comment,
					status,
					queuedAt
				})
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
					hasClock: leg.hasClock,
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
		// e.g. a driver switched to the train – their passengers are free again
		cleanupRideLinks(input.eventId);
	});
}

/**
 * The event moved to other days: travel plans move along by the same number of calendar days,
 * keeping their time of day (arrival with the first day, departure with the last).
 */
export function shiftTravelDays(
	eventId: string,
	shift: Record<TravelDirection, number>,
	timezone: string
) {
	if (!shift.to && !shift.from) return;
	db.transaction(() => {
		const legs = db
			.select({ id: travelLeg.id, direction: travelLeg.direction, time: travelLeg.time })
			.from(travelLeg)
			.innerJoin(registration, eq(registration.id, travelLeg.registrationId))
			.where(eq(registration.eventId, eventId))
			.all();
		for (const leg of legs) {
			const days = shift[leg.direction];
			if (!days) continue;
			if (leg.time) {
				db.update(travelLeg)
					.set({ time: addLocalDays(leg.time, days, timezone) })
					.where(eq(travelLeg.id, leg.id))
					.run();
			}
			for (const p of db.select().from(pickupOption).where(eq(pickupOption.legId, leg.id)).all()) {
				if (!p.time) continue;
				db.update(pickupOption)
					.set({ time: addLocalDays(p.time, days, timezone) })
					.where(eq(pickupOption.id, p.id))
					.run();
			}
		}
	});
}

export function withdrawRegistration(eventId: string, userId: string) {
	db.update(registration)
		.set({ status: 'withdrawn', queuedAt: null, updatedAt: new Date() })
		.where(and(eq(registration.eventId, eventId), eq(registration.userId, userId)))
		.run();
	cleanupRideLinks(eventId);
}

/* --------------------------------------------------------------- waiting list */

/** 1-based place on the waiting list, or null if not waiting. */
export function waitlistPosition(eventId: string, userId: string): number | null {
	const queue = db
		.select({ userId: registration.userId })
		.from(registration)
		.where(and(eq(registration.eventId, eventId), eq(registration.status, 'waitlisted')))
		.orderBy(asc(registration.queuedAt), asc(registration.createdAt))
		.all();
	const i = queue.findIndex((r) => r.userId === userId);
	return i < 0 ? null : i + 1;
}

/**
 * Places free (somebody withdrew, more capacity): the first people on the waiting list move up,
 * in the order they joined. Returns their user ids – the caller tells them (notifyPromoted).
 * Nothing moves once the event is over.
 */
export function promoteWaitlist(eventId: string, now = new Date()): string[] {
	return db.transaction(() => {
		const e = db.select().from(event).where(eq(event.id, eventId)).get();
		if (!e || e.status !== 'published' || e.endsAt <= now) return [];
		const queue = db
			.select({ id: registration.id, userId: registration.userId })
			.from(registration)
			.where(and(eq(registration.eventId, eventId), eq(registration.status, 'waitlisted')))
			.orderBy(asc(registration.queuedAt), asc(registration.createdAt))
			.all();
		const free = e.capacity === null ? queue.length : e.capacity - countActiveRegistrations(e.id);
		const moving = queue.slice(0, Math.max(0, free));
		for (const r of moving) activateRegistration(r.id);
		return moving.map((r) => r.userId);
	});
}

/** Somebody is waiting – newcomers queue up behind them, even if a place happens to be free. */
export function hasWaitlist(eventId: string): boolean {
	return !!db
		.select({ id: registration.id })
		.from(registration)
		.where(and(eq(registration.eventId, eventId), eq(registration.status, 'waitlisted')))
		.get();
}

/** Events where the user holds a place (active registration). */
export function activeEventIds(userId: string): string[] {
	return db
		.select({ eventId: registration.eventId })
		.from(registration)
		.where(and(eq(registration.userId, userId), eq(registration.status, 'active')))
		.all()
		.map((r) => r.eventId);
}

/** Makes a (waiting or withdrawn) registration active. */
export function activateRegistration(registrationId: string) {
	db.update(registration)
		.set({ status: 'active', queuedAt: null, updatedAt: new Date() })
		.where(eq(registration.id, registrationId))
		.run();
}

/** Events the user is registered for (or waiting for a place) – for the dashboard. */
export function listRegistrationsForUser(userId: string) {
	return db
		.select({ event, status: registration.status })
		.from(registration)
		.innerJoin(event, eq(event.id, registration.eventId))
		.where(
			and(eq(registration.userId, userId), inArray(registration.status, ['active', 'waitlisted']))
		)
		.orderBy(asc(event.startsAt))
		.all()
		.map((r) => ({ ...r.event, waiting: r.status === 'waitlisted' }));
}
