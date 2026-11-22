import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';
import { createEvent, eventIdOf, loginAs, outbox, ready, registerDirect } from './helpers';

const DB_PATH = 'e2e/.tmp/test.db';
const BASE = 'http://localhost:4317';

function sql<T = unknown>(query: string, ...args: unknown[]): T {
	const db = new Database(DB_PATH);
	const stmt = db.prepare(query);
	const result = (stmt.reader ? stmt.get(...args) : stmt.run(...args)) as T;
	db.close();
	return result;
}

/** Local "YYYY-MM-DD" of a unix timestamp in Berlin. */
const berlinDay = (unix: number) =>
	new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(unix * 1000));

test('publishing needs a confirmed e-mail address – the link is sent from the event page', async ({
	page,
	context
}) => {
	const guest = await loginAs(context, 'Gast Gina');
	sql('update user set email_verified_at = null where id = ?', guest.userId);
	const slug = createEvent(guest.userId, {
		title: 'Unbestätigtes Fest',
		fields: [{ type: 'travel', label: 'Anreise', config: { directions: ['to'] } }]
	});
	const id = eventIdOf(slug);
	sql("update event set status = 'draft' where id = ?", id);

	await page.goto(`/events/${id}`);
	await ready(page);
	await expect(page.getByText(/Bestätige noch deine E-Mail-Adresse/)).toBeVisible();
	const publish = page.getByRole('button', { name: 'Veröffentlichen' });
	await expect(publish).toBeDisabled();

	await page.getByRole('button', { name: 'Bestätigungslink senden' }).click();
	await expect(page.getByText(/Der Link ist unterwegs/)).toBeVisible();
	const mail = outbox(guest.email).at(-1)!;
	const link = mail.text.match(/https?:\/\/\S+\/auth\/link\?token=\S+/)![0];

	await page.goto(link);
	await page.waitForURL(`**/events/${id}`);
	await ready(page);
	await expect(page.getByText(/Bestätige noch deine E-Mail-Adresse/)).toHaveCount(0);
	await page.getByRole('button', { name: 'Veröffentlichen' }).click();
	await expect(
		page.getByRole('heading', { name: 'Deine Veranstaltung ist online!' })
	).toBeVisible();
	expect(sql<{ status: string }>('select status from event where id = ?', id).status).toBe(
		'published'
	);
});

test('moving an event tells the participants and moves their travel days; deleting cancels', async ({
	page,
	context,
	browser
}) => {
	const olga = await loginAs(context, 'Olga Orga');
	const slug = createEvent(olga.userId, {
		title: 'Wanderlager',
		fields: [{ type: 'travel', label: 'Anreise', config: { directions: ['to', 'from'] } }]
	});
	const id = eventIdOf(slug);
	const pia = await loginAs(await browser.newContext(), 'Pia');
	const regId = registerDirect(slug, pia.userId, {
		to: { mode: 'seeking', area: 'Köln', lat: 50.94, lon: 6.96 }
	});
	const ev = sql<{ starts_at: number; ends_at: number }>(
		'select starts_at, ends_at from event where id = ?',
		id
	);
	// Pia sets off at 10:00 on the first day
	const startDay = berlinDay(ev.starts_at);
	const tenOclock = Math.floor(new Date(`${startDay}T10:00:00+02:00`).getTime() / 1000);
	sql(
		"update travel_leg set time = ?, has_clock = 1 where registration_id = ? and direction = 'to'",
		tenOclock,
		regId
	);

	// one week later – submitted like the form does
	const week = 7 * 86400;
	const res = await context.request.post(`/events/${id}/details`, {
		headers: { origin: BASE },
		form: {
			title: 'Wanderlager',
			description: '',
			locationName: 'Jugendhof Waldheim',
			address: 'Am Wald 3, 57000 Waldheim',
			area: 'Waldheim',
			lat: '50.9',
			lon: '8.1',
			startDate: berlinDay(ev.starts_at + week),
			startTime: '',
			endDate: berlinDay(ev.ends_at + week),
			endTime: '',
			timezone: 'Europe/Berlin',
			contactEmail: 'orga@example.org',
			rideVisibility: 'public',
			capacity: ''
		}
	});
	expect(res.status()).toBe(200);

	await expect
		.poll(() => outbox(pia.email).map((m) => m.subject))
		.toContain('Geändert: Wanderlager');
	const changed = outbox(pia.email).find((m) => m.subject === 'Geändert: Wanderlager')!;
	expect(changed.text).toContain('Neuer Termin');
	expect(changed.text).toContain('Reiseangaben sind mit auf die neuen Tage gewandert');
	expect(changed.replyTo).toBe('orga@example.org');
	const leg = sql<{ time: number }>(
		"select time from travel_leg where registration_id = ? and direction = 'to'",
		regId
	);
	expect(leg.time).toBe(tenOclock + week);

	// deleting: Pia gets a cancellation
	await page.goto(`/events/${id}/settings`);
	await ready(page);
	await page.getByLabel(/Zur Bestätigung den Titel/).fill('Wanderlager');
	await page.getByRole('button', { name: 'Endgültig löschen' }).click();
	await page.waitForURL(`${BASE}/`);
	await expect
		.poll(() => outbox(pia.email).map((m) => m.subject))
		.toContain('Abgesagt: Wanderlager');
});

test('deleting the account deletes the events organized alone – and cancels them', async ({
	page,
	context,
	browser
}) => {
	const olga = await loginAs(context, 'Olga Allein');
	const sole = createEvent(olga.userId, {
		title: 'Olgas Sommerfest',
		fields: [{ type: 'travel', label: 'Anreise', config: { directions: ['to'] } }]
	});
	const shared = createEvent(olga.userId, { title: 'Gemeinsames Treffen', fields: [] });
	const ben = await loginAs(await browser.newContext(), 'Ben Mitorga');
	sql(
		'insert into event_organizer (event_id, user_id, created_at) values (?, ?, ?)',
		eventIdOf(shared),
		ben.userId,
		Math.floor(Date.now() / 1000)
	);
	const pia = await loginAs(await browser.newContext(), 'Pia');
	registerDirect(sole, pia.userId, { to: { mode: 'undecided' } });

	await page.goto('/profile');
	await ready(page);
	const zone = page.locator('.danger-zone');
	await expect(zone.getByText(/organisierst du allein/)).toBeVisible();
	await expect(zone.getByRole('link', { name: 'Olgas Sommerfest' })).toBeVisible();
	await expect(zone.getByText('Gemeinsames Treffen')).toHaveCount(0);

	await zone.getByLabel(/Zur Bestätigung/).fill(olga.email);
	await zone.getByRole('button', { name: 'Konto endgültig löschen' }).click();
	await page.waitForURL('**/?deleted=1');

	const count = (slug: string) =>
		sql<{ n: number }>('select count(*) as n from event where slug = ?', slug).n;
	expect(count(sole)).toBe(0);
	expect(count(shared)).toBe(1);
	await expect
		.poll(() => outbox(pia.email).map((m) => m.subject))
		.toContain('Abgesagt: Olgas Sommerfest');
});
