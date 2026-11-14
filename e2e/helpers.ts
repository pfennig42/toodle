import { createHash, randomBytes, randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type { BrowserContext, Page } from '@playwright/test';

const DB_PATH = 'e2e/.tmp/test.db';
const BASE = 'http://localhost:4317';

/** Creates an onboarded user with a session directly in the test database and logs the context in. */
export async function loginAs(context: BrowserContext, name: string) {
	const db = new Database(DB_PATH);
	const userId = randomUUID();
	const email = `${name.toLowerCase().replace(/\W+/g, '.')}.${randomBytes(3).toString('hex')}@example.org`;
	const now = Math.floor(Date.now() / 1000);
	db.prepare(
		'insert into user (id, email, name, onboarded_at, created_at) values (?, ?, ?, ?, ?)'
	).run(userId, email, name, now, now);
	const token = randomBytes(32).toString('base64url');
	const id = createHash('sha256').update(token).digest('hex');
	db.prepare('insert into session (id, user_id, expires_at) values (?, ?, ?)').run(
		id,
		userId,
		now + 86400
	);
	db.close();
	await context.addCookies([
		{ name: 'toodle-session', value: token, url: BASE, httpOnly: true, sameSite: 'Lax' }
	]);
	return { userId, email };
}

const GEO_FIXTURES = [
	{
		match: /tal/i,
		name: 'Talhausen Bf',
		address: 'Talhausen Bf, Bahnhofstr. 2, 57010 Talhausen, Deutschland',
		area: 'Talhausen',
		lat: 50.95,
		lon: 8.2
	},
	{
		match: /bahnhof|bf/i,
		name: 'Waldheim Bahnhof',
		address: 'Waldheim Bahnhof, Bahnhofstr. 1, 57000 Waldheim, Deutschland',
		area: 'Waldheim',
		lat: 50.91,
		lon: 8.11
	},
	{
		match: /.*/,
		name: 'Jugendhof Waldheim',
		address: 'Jugendhof Waldheim, Am Wald 3, 57000 Waldheim, Deutschland',
		area: 'Waldheim',
		lat: 50.9,
		lon: 8.1
	}
];

/** Geocoding is mocked so tests don't depend on the public Photon service. */
export async function mockGeocoder(page: Page) {
	await page.route('**/api/geocode?**', (route) => {
		const q = new URL(route.request().url()).searchParams.get('q') ?? '';
		const hit = GEO_FIXTURES.find((f) => f.match.test(q))!;
		const { name, address, area, lat, lon } = hit;
		return route.fulfill({ json: [{ name, address, area, lat, lon }] });
	});
}

/** Adds a saved place to a user (like the onboarding would). */
export function addPlace(userId: string, label: string, area: string, lat: number, lon: number) {
	const db = new Database(DB_PATH);
	db.prepare(
		'insert into place (id, user_id, label, address, area, lat, lon, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
	).run(
		randomUUID(),
		userId,
		label,
		`${label}straße 1, ${area}`,
		area,
		lat,
		lon,
		Math.floor(Date.now() / 1000)
	);
	db.close();
}

type FieldSpec = { type: string; label: string; required?: boolean; config?: object };

/** Creates a published event owned by `ownerId` directly in the database. Returns its slug. */
export function createEvent(
	ownerId: string,
	opts: {
		title: string;
		fields: FieldSpec[];
		capacity?: number | null;
		deadlinePassed?: boolean;
	}
) {
	const db = new Database(DB_PATH);
	const id = randomUUID();
	const slug = randomBytes(5).toString('hex');
	const now = Math.floor(Date.now() / 1000);
	const day = 86400;
	db.prepare(
		`insert into event (id, slug, title, description, location_name, location_address, location_area, lat, lon,
		 starts_at, ends_at, timezone, registration_deadline, registration_closed, capacity, status, created_by, created_at, updated_at)
		 values (?, ?, ?, '', 'Jugendhof Waldheim', 'Am Wald 3, 57000 Waldheim', 'Waldheim', 50.9, 8.1,
		 ?, ?, 'Europe/Berlin', ?, 0, ?, 'published', ?, ?, ?)`
	).run(
		id,
		slug,
		opts.title,
		now + 20 * day,
		now + 22 * day,
		opts.deadlinePassed ? now - day : null,
		opts.capacity ?? null,
		ownerId,
		now,
		now
	);
	db.prepare('insert into event_organizer (event_id, user_id, created_at) values (?, ?, ?)').run(
		id,
		ownerId,
		now
	);
	opts.fields.forEach((f, i) =>
		db
			.prepare(
				'insert into form_field (id, event_id, position, type, label, help, required, config) values (?, ?, ?, ?, ?, ?, ?, ?)'
			)
			.run(
				randomUUID(),
				id,
				i,
				f.type,
				f.label,
				'',
				f.required ? 1 : 0,
				JSON.stringify(f.config ?? {})
			)
	);
	db.close();
	return slug;
}

/** Sets the registration deadline of an event into the past. */
export function passDeadline(slug: string) {
	const db = new Database(DB_PATH);
	db.prepare('update event set registration_deadline = ? where slug = ?').run(
		Math.floor(Date.now() / 1000) - 60,
		slug
	);
	db.close();
}

/** "YYYY-MM-DDTHH:mm" n days from now at the given hour (for datetime-local inputs). */
export function localDateTime(daysFromNow: number, hour: number) {
	const d = new Date();
	d.setDate(d.getDate() + daysFromNow);
	d.setHours(hour, 0, 0, 0);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/** Waits until the app is interactive (set in the root layout's onMount). */
export async function ready(page: Page) {
	await page.waitForSelector('html[data-hydrated]');
}
