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

/** Geocoding is mocked so tests don't depend on the public Photon service. */
export async function mockGeocoder(page: Page) {
	await page.route('**/api/geocode?**', (route) =>
		route.fulfill({
			json: [
				{
					address: 'Jugendhof Waldheim, Am Wald 3, 57000 Waldheim, Deutschland',
					area: 'Waldheim',
					lat: 50.9,
					lon: 8.1
				}
			]
		})
	);
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
