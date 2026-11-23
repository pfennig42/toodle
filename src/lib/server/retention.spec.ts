import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import * as schema from './db/schema.js';
import { purgeDate, purgeOldData } from './retention.js';

const DAY = 86_400_000;

/** A fresh database in a temp directory – never the development data. */
function testDb() {
	const client = new Database(join(mkdtempSync(join(tmpdir(), 'toodle-test-')), 'test.db'));
	client.pragma('foreign_keys = ON');
	const db = drizzle(client, { schema });
	migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}

describe('purgeOldData', () => {
	it('deletes registrations a year after the event, keeps the event and unused accounts tidy', () => {
		const db = testDb();
		const { user, event, eventOrganizer, registration, formField, session } = schema;
		const now = new Date('2028-09-01T00:00:00Z');
		const ago = (days: number) => new Date(now.getTime() - days * DAY);

		const [orga, anna, guestOld, guestNew, guestOrga] = [
			{ id: 'orga', email: 'orga@x.org', emailVerifiedAt: ago(900) },
			{ id: 'anna', email: 'anna@x.org', emailVerifiedAt: ago(900) },
			{ id: 'g-old', email: 'g1@x.org', createdAt: ago(400) },
			{ id: 'g-new', email: 'g2@x.org', createdAt: ago(5) },
			{ id: 'g-orga', email: 'g3@x.org', createdAt: ago(400) }
		];
		db.insert(user).values([orga, anna, guestOld, guestNew, guestOrga]).run();
		const ev = (id: string, endedDaysAgo: number) => ({
			id,
			slug: id,
			title: id,
			startsAt: ago(endedDaysAgo + 1),
			endsAt: ago(endedDaysAgo)
		});
		db.insert(event)
			.values([ev('old', 370), ev('recent', 200)])
			.run();
		db.insert(eventOrganizer)
			.values([
				{ eventId: 'old', userId: 'orga' },
				{ eventId: 'recent', userId: 'g-orga' }
			])
			.run();
		db.insert(formField)
			.values({ eventId: 'old', position: 0, type: 'checkbox', label: 'Veggie' })
			.run();
		db.insert(registration)
			.values([
				{ eventId: 'old', userId: 'anna' },
				{ eventId: 'old', userId: 'g-old' },
				{ eventId: 'recent', userId: 'anna' }
			])
			.run();
		db.insert(session)
			.values({ id: 's1', userId: 'anna', expiresAt: ago(1) })
			.run();

		expect(purgeOldData(db, now)).toEqual({ events: 1, registrations: 2, guests: 1 });

		const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();
		// the old event and its form stay (to be duplicated), its registrations are gone
		expect(ids(db.select({ id: event.id }).from(event).all())).toEqual(['old', 'recent']);
		expect(db.select().from(formField).all()).toHaveLength(1);
		expect(
			db
				.select()
				.from(registration)
				.all()
				.map((r) => r.eventId)
		).toEqual(['recent']);
		// the old guest had nothing left; the fresh one and the organizing one stay
		expect(ids(db.select({ id: user.id }).from(user).all())).toEqual([
			'anna',
			'g-new',
			'g-orga',
			'orga'
		]);
		expect(db.select().from(session).all()).toHaveLength(0);
	});

	it('tells when an event’s registrations will be deleted', () => {
		expect(purgeDate(new Date('2027-07-18T12:00:00Z')).toISOString()).toBe(
			'2028-07-17T12:00:00.000Z'
		);
	});
});
