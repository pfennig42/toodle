import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createEvent, eventIdOf, loginAs, outbox, ready, registerDirect } from './helpers';

const KOELN = { area: 'Köln-Ehrenfeld', lat: 50.94, lon: 6.96 };

test('organizers see participants, export CSV, remove people and plan days', async ({
	browser,
	page,
	context
}) => {
	const olga = await loginAs(context, 'Olga Orga');
	const people: Record<string, string> = {};
	const others = await browser.newContext({ locale: 'de-DE' });
	for (const name of ['Anna', 'Ben', 'Cleo']) {
		people[name] = (await loginAs(await browser.newContext(), name)).userId;
	}
	await loginAs(others, 'Anna Andere');

	const slug = createEvent(olga.userId, {
		title: 'Sommerlager 2027',
		fields: [
			{ type: 'travel', label: 'Anreise', config: { directions: ['to'] } },
			{ type: 'single_choice', label: 'Essen', config: { options: ['vegan', 'alles'] } },
			{ type: 'number', label: 'Kinder' }
		]
	});
	const id = eventIdOf(slug);
	registerDirect(
		slug,
		people.Anna,
		{ to: { mode: 'car', ...KOELN } },
		{ kind: 'whatsapp', value: '+491701234567' },
		{ Essen: 'vegan', Kinder: 2 }
	);
	registerDirect(slug, people.Ben, { to: { mode: 'transit' } }, undefined, {
		Essen: '=HYPERLINK("x")'
	});
	registerDirect(slug, people.Cleo, { to: { mode: 'undecided' } }, undefined, {
		Essen: 'vegan',
		Kinder: 1
	});

	// --- list
	await page.goto(`/events/${id}/participants`);
	await ready(page);
	await expect(page.locator('.count').getByText('3 angemeldet')).toBeVisible();

	await page.getByRole('searchbox', { name: 'Name oder E-Mail suchen' }).fill('ann');
	const persons = page.getByRole('listitem').filter({ has: page.locator('details') });
	await expect(persons).toHaveCount(1);
	await persons.first().locator('summary').click();
	await expect(persons.first().getByText('vegan')).toBeVisible();
	await expect(persons.first().getByRole('link', { name: 'WhatsApp' })).toBeVisible();
	await expect(persons.first().getByText('Geheimstraße')).toHaveCount(0);
	await page.getByRole('searchbox', { name: 'Name oder E-Mail suchen' }).fill('');
	await expect(persons).toHaveCount(3);

	// --- CSV export
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'CSV exportieren' }).click()
	]);
	expect(download.suggestedFilename()).toBe('sommerlager-2027.csv');
	const csv = await readFile((await download.path())!, 'utf-8');
	expect(csv.charCodeAt(0)).toBe(0xfeff);
	const lines = csv.slice(1).trim().split('\r\n');
	expect(lines[0]).toBe(
		'Name;E-Mail;Kontakt;Status;Angemeldet am;Anreise: Wie;Anreise: Ort;Anreise: Zeit;Anreise: Auto;Anreise: Abholpunkte;Anreise: Mitfahrt;Essen;Kinder;Kommentar'
	);
	expect(lines).toHaveLength(4);
	const annaRow = lines.find((l) => l.startsWith('Anna;'))!;
	expect(annaRow).toContain('whatsapp: +491701234567');
	expect(annaRow).toContain(';Auto;Zuhause (Köln-Ehrenfeld);');
	expect(annaRow).toContain(';vegan;2;');
	expect(csv).not.toContain('Geheimstraße');
	// formula neutralized
	expect(lines.find((l) => l.startsWith('Ben;'))).toContain(`"'=HYPERLINK(""x"")"`);

	// participants can't export
	const res = await others.request.get(`/events/${id}/participants.csv`);
	expect(res.status()).toBe(404);

	// --- withdraw, then delete for good
	const ben = persons.filter({ hasText: 'Ben' });
	await ben.locator('summary').click();
	await ben.getByRole('button', { name: 'Abmelden' }).click();
	await ben.getByRole('button', { name: 'Ben abmelden' }).click();
	await expect(page.locator('.count').getByText('2 angemeldet')).toBeVisible();
	await expect(page.getByText('1 abgemeldet')).toBeVisible();
	await expect(persons).toHaveCount(2);

	await page.getByRole('button', { name: 'Abgemeldet', exact: true }).click();
	await expect(persons).toHaveCount(1);
	await persons.first().locator('summary').click();
	await persons.first().getByRole('button', { name: 'Endgültig löschen' }).click();
	await persons.first().getByRole('button', { name: 'Ja, endgültig löschen' }).click();
	await expect(page.getByText('Niemand gefunden.')).toBeVisible();

	// --- planning
	await page
		.getByRole('navigation', { name: 'Bereiche der Veranstaltung' })
		.getByRole('link', { name: 'Planung' })
		.click();
	await expect(page.getByRole('heading', { name: 'Belegung pro Tag' })).toBeVisible();
	const days = page.getByRole('article');
	await expect(days).toHaveCount(3);
	const firstDay = days.first();
	await expect(firstDay.locator('dd').first()).toHaveText('2');
	await firstDay.getByText('Antworten der Anwesenden').click();
	await expect(firstDay.getByText('2 × vegan')).toBeVisible();
	await expect(firstDay.getByText('Summe 3')).toBeVisible();

	const answers = page.getByRole('region', { name: 'Antworten insgesamt' });
	await expect(answers.getByRole('listitem').filter({ hasText: 'vegan' })).toContainText('2');
	const mobility = page.getByRole('region', { name: 'Mobilität' });
	await expect(mobility.getByRole('listitem').filter({ hasText: 'Auto' })).toContainText('1');
	await expect(mobility.getByRole('listitem').filter({ hasText: 'Keine Angabe' })).toContainText(
		'1'
	);
});

test('organizers add somebody by hand – that person gets a mail to complete the details', async ({
	page,
	context
}) => {
	const olga = await loginAs(context, 'Olga Orga');
	const slug = createEvent(olga.userId, {
		title: 'Chorwochenende',
		fields: [{ type: 'travel', label: 'Anreise', config: { directions: ['to'] } }]
	});
	const email = `telefon.${Date.now()}@example.org`;

	await page.goto(`/events/${eventIdOf(slug)}/participants`);
	await ready(page);
	await page.getByText('+ Person hinzufügen').click();
	await page.getByLabel('Name', { exact: true }).fill('Telefon Theo');
	await page.getByLabel('E-Mail', { exact: true }).fill(email);
	await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
	await expect(
		page.getByText('Telefon Theo ist angemeldet und hat eine Mail bekommen.')
	).toBeVisible();
	await expect(page.locator('.people').getByText('Telefon Theo')).toBeVisible();

	await expect
		.poll(() => outbox(email).map((m) => m.subject))
		.toContain('Angemeldet: Chorwochenende');
	const mail = outbox(email).find((m) => m.subject === 'Angemeldet: Chorwochenende')!;
	expect(mail.text).toContain('Olga Orga hat dich für „Chorwochenende“ angemeldet.');
	expect(mail.replyTo).toBe('orga@example.org');

	// a second time: already there
	await page.getByText('+ Person hinzufügen').click();
	await page.getByLabel('Name', { exact: true }).fill('Telefon Theo');
	await page.getByLabel('E-Mail', { exact: true }).fill(email);
	await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
	await expect(page.getByText('Diese Person ist schon angemeldet.')).toBeVisible();
});

test('organizers write to everybody registered – answers go to them, they get a copy', async ({
	page,
	context,
	browser
}) => {
	const olga = await loginAs(context, 'Olga Orga');
	const slug = createEvent(olga.userId, { title: 'Zeltlager', fields: [] });
	const anna = await loginAs(await browser.newContext(), 'Anna');
	const ben = await loginAs(await browser.newContext(), 'Ben');
	registerDirect(slug, anna.userId, {});
	registerDirect(slug, ben.userId, {});

	await page.goto(`/events/${eventIdOf(slug)}/participants`);
	await ready(page);
	await page.getByText('✉ Nachricht an alle').click();
	await page.getByLabel('Betreff').fill('Treffpunkt geändert');
	await page
		.getByLabel('Nachricht', { exact: true })
		.fill('Wir treffen uns am Bahnhof.\n\nBis bald!');
	await page.getByRole('button', { name: 'Senden', exact: true }).click();
	await expect(page.getByText('Die Nachricht geht an 2 Personen.')).toBeVisible();

	const subject = 'Zeltlager: Treffpunkt geändert';
	for (const who of [anna, ben]) {
		await expect.poll(() => outbox(who.email).map((m) => m.subject)).toContain(subject);
		const mail = outbox(who.email).find((m) => m.subject === subject)!;
		expect(mail.text).toContain('Wir treffen uns am Bahnhof.');
		expect(mail.text).toContain('Viele Grüße, Olga Orga (Orga)');
		expect(mail.replyTo).toBe('orga@example.org');
	}
	await expect.poll(() => outbox(olga.email).map((m) => m.subject)).toContain(`[Kopie] ${subject}`);
});
