/**
 * Data retention (docs/konzept.md 6, "Datenschutz"): personal data is kept as long as it's
 * useful, not forever.
 *
 * - One year after an event ended, its registrations go – answers, travel plans, ride links,
 *   what was mailed. The event and its form stay, so it can be duplicated next year.
 * - Silent guest accounts (e-mail never confirmed) that have nothing left – no registration,
 *   no event to organize – go too.
 * - Expired sessions, login links and team invites are cleaned up.
 */
import { and, eq, inArray, isNull, lt, notExists, or, isNotNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema.js';
import {
	emailChange,
	event,
	eventOrganizer,
	eventVisit,
	loginToken,
	notification,
	organizerInvite,
	registration,
	session,
	user
} from './db/schema.js';

export const RETENTION_DAYS = 365;
/** Guest accounts younger than this stay – they may be in the middle of registering. */
const GUEST_GRACE_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** When the registrations of an event that ends at `endsAt` are deleted. */
export const purgeDate = (endsAt: Date) => new Date(endsAt.getTime() + RETENTION_DAYS * DAY);

export type PurgeResult = { events: number; registrations: number; guests: number };

/** The database is passed in (no import of ./db): tests run this against a throwaway one. */
export type Db = BetterSQLite3Database<typeof schema>;

export function purgeOldData(db: Db, now = new Date()): PurgeResult {
	const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY);
	return db.transaction(() => {
		const old = db
			.select({ id: event.id })
			.from(event)
			.where(lt(event.endsAt, cutoff))
			.all()
			.map((e) => e.id);

		let registrations = 0;
		if (old.length) {
			// answers, travel legs, pick-up points and ride links go with them (cascade)
			registrations = db
				.delete(registration)
				.where(inArray(registration.eventId, old))
				.run().changes;
			db.delete(notification).where(inArray(notification.eventId, old)).run();
			db.delete(eventVisit).where(inArray(eventVisit.eventId, old)).run();
			db.delete(organizerInvite).where(inArray(organizerInvite.eventId, old)).run();
		}

		const guests = db
			.delete(user)
			.where(
				and(
					isNull(user.emailVerifiedAt),
					lt(user.createdAt, new Date(now.getTime() - GUEST_GRACE_DAYS * DAY)),
					notExists(db.select().from(registration).where(eq(registration.userId, user.id))),
					notExists(db.select().from(eventOrganizer).where(eq(eventOrganizer.userId, user.id)))
				)
			)
			.run().changes;

		db.delete(session).where(lt(session.expiresAt, now)).run();
		db.delete(loginToken)
			.where(or(lt(loginToken.expiresAt, now), isNotNull(loginToken.usedAt)))
			.run();
		db.delete(organizerInvite).where(lt(organizerInvite.expiresAt, now)).run();
		db.delete(emailChange).where(lt(emailChange.expiresAt, now)).run();

		return { events: old.length, registrations, guests };
	});
}
