/**
 * "Finish your registration": events someone opened while logged in but hasn't registered for
 * yet. Shown on the start page while registration is open – until registered or hidden.
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from './db/index.js';
import { event, eventVisit, registration } from './db/schema.js';
import { registrationState } from './events.js';

/** Remembers the visit. Looking again brings back an event that was hidden before. */
export function recordVisit(userId: string, eventId: string, now = new Date()) {
	db.insert(eventVisit)
		.values({ userId, eventId, seenAt: now })
		.onConflictDoUpdate({
			target: [eventVisit.userId, eventVisit.eventId],
			set: { seenAt: now, dismissedAt: null }
		})
		.run();
}

export function dismissVisit(userId: string, eventId: string, now = new Date()) {
	db.update(eventVisit)
		.set({ dismissedAt: now })
		.where(and(eq(eventVisit.userId, userId), eq(eventVisit.eventId, eventId)))
		.run();
}

/**
 * Events still waiting for a registration: visited, not hidden, published, registration open,
 * and no registration of this person at all – somebody who withdrew decided already.
 */
export function listUnfinished(userId: string, now = new Date()) {
	return db
		.select({ event })
		.from(eventVisit)
		.innerJoin(event, eq(event.id, eventVisit.eventId))
		.leftJoin(
			registration,
			and(eq(registration.eventId, event.id), eq(registration.userId, userId))
		)
		.where(
			and(
				eq(eventVisit.userId, userId),
				isNull(eventVisit.dismissedAt),
				isNull(registration.id),
				eq(event.status, 'published'),
				gt(event.endsAt, now)
			)
		)
		.orderBy(event.startsAt)
		.all()
		.map((r) => r.event)
		.filter((e) => registrationState(e, now) === 'open');
}
