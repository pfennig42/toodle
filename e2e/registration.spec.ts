import { expect, test, type Page } from '@playwright/test';
import { addPlace, createEvent, loginAs, mockGeocoder, passDeadline, ready } from './helpers';

const FIELDS = [
	{
		type: 'travel',
		label: 'Anreise & Abreise',
		required: true,
		config: { directions: ['to', 'from'] }
	},
	{
		type: 'single_choice',
		label: 'Wie isst du?',
		required: true,
		config: { options: ['Vegetarisch', 'Vegan', 'Alles'] }
	}
];

const leg = (page: Page, name: 'Anreise' | 'Abreise') =>
	page.getByRole('group', { name, exact: true });

test('participant signs up with two alternative pick-up stations, edits and withdraws', async ({
	page,
	context,
	browser
}, testInfo) => {
	const shot = (name: string) =>
		page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
	const owner = await (async () => {
		const ctx = await browser.newContext();
		const u = await loginAs(ctx, 'Orga Olga');
		await ctx.close();
		return u;
	})();
	const slug = createEvent(owner.userId, { title: 'Pfingstlager', fields: FIELDS });

	// Not logged in → login link keeps the way back
	const anon = await browser.newContext({ locale: 'de-DE' });
	const anonPage = await anon.newPage();
	await anonPage.goto(`/e/${slug}`);
	await expect(anonPage.getByRole('link', { name: 'Einloggen & anmelden' })).toHaveAttribute(
		'href',
		`/login?next=${encodeURIComponent(`/e/${slug}`)}`
	);
	await anon.close();

	const lea = await loginAs(context, 'Lea S.');
	addPlace(lea.userId, 'Zuhause', 'Köln-Ehrenfeld', 50.94, 6.94);
	await mockGeocoder(page);
	await page.goto(`/e/${slug}`);
	await ready(page);

	// Submitting without choices shows errors
	await page.getByRole('button', { name: 'Verbindlich anmelden' }).click();
	await expect(page.getByText('Bitte prüfe die markierten Angaben.')).toBeVisible();
	await expect(leg(page, 'Anreise').getByText(/Bitte wähle aus, wie du an/)).toBeVisible();
	await expect(page.getByText('Bitte ausfüllen.')).toBeVisible();

	// Arrival by train – two alternative stations
	await leg(page, 'Anreise').getByRole('radio', { name: /ÖV/ }).click();
	await leg(page, 'Anreise').getByRole('button', { name: '+ Bahnhof hinzufügen' }).click();
	await leg(page, 'Anreise')
		.getByPlaceholder('Bahnhof oder Treffpunkt suchen …')
		.fill('Waldheim Bahnhof');
	await leg(page, 'Anreise')
		.getByRole('button', { name: /Waldheim Bahnhof/ })
		.click();
	await leg(page, 'Anreise')
		.getByLabel(/Ankunft dort ca/)
		.fill('2030-01-01T16:40');
	await leg(page, 'Anreise').getByRole('button', { name: '+ Weitere Alternative' }).click();
	await leg(page, 'Anreise').getByPlaceholder('Bahnhof oder Treffpunkt suchen …').fill('Talhausen');
	await leg(page, 'Anreise')
		.getByRole('button', { name: /Talhausen Bf/ })
		.click();

	// Departure by car, already full
	await leg(page, 'Abreise').getByRole('radio', { name: /Auto/ }).click();
	await expect(leg(page, 'Abreise').getByRole('combobox')).toHaveValue(/.+/); // saved place preselected
	await leg(page, 'Abreise').getByRole('radio', { name: 'Auto ist voll' }).click();

	await page.getByRole('radio', { name: 'Vegan' }).check();
	await page.getByLabel(/Kommentar/).fill('Komme evtl. etwas später');
	await shot('01-form-filled');
	await page.getByRole('button', { name: 'Verbindlich anmelden' }).click();

	// Summary
	await expect(page.getByText('✓ Du bist angemeldet')).toBeVisible();
	const summary = page.locator('#registration');
	await expect(summary.getByText(/Abholung:/)).toContainText('Waldheim Bahnhof');
	await expect(summary.getByText(/Abholung:/)).toContainText('oder');
	await expect(summary.getByText(/Abholung:/)).toContainText('Talhausen Bf');
	await expect(summary.getByText('Auto ist voll')).toBeVisible();
	await expect(summary.getByText('Vegan')).toBeVisible();
	await expect(summary.getByText(/Kontaktweg/)).toBeVisible(); // no contact yet → hint
	await shot('02-summary');

	// Edit: car has room again – values are prefilled
	await page.getByRole('button', { name: 'Anmeldung bearbeiten' }).click();
	await expect(leg(page, 'Anreise').getByText('Talhausen Bf', { exact: true })).toBeVisible();
	await leg(page, 'Abreise').getByRole('radio', { name: 'Nehme gerne Leute mit' }).click();
	await page.getByRole('button', { name: 'Änderungen speichern' }).click();
	await expect(page.getByText('Deine Anmeldung wurde aktualisiert.')).toBeVisible();
	await expect(summary.getByText('Nehme gerne Leute mit')).toBeVisible();

	// Dashboard lists the registration
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Meine Anmeldungen' })).toBeVisible();
	await page.getByRole('link', { name: /Pfingstlager/ }).click();

	// Withdraw
	await page.getByText('Abmelden', { exact: true }).click();
	await page.getByRole('button', { name: 'Ja, abmelden' }).click();
	await expect(page.getByText('Du hast dich abgemeldet.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Verbindlich anmelden' })).toBeVisible();
});

test('full events and passed deadlines', async ({ page, context, browser }) => {
	const ownerCtx = await browser.newContext();
	const owner = await loginAs(ownerCtx, 'Orga Otto');
	await ownerCtx.close();

	// Capacity 1, already taken by someone else
	const fullSlug = createEvent(owner.userId, {
		title: 'Kleines Treffen',
		capacity: 1,
		fields: [{ type: 'short_text', label: 'Was bringst du mit?' }]
	});
	const first = await browser.newContext({ locale: 'de-DE' });
	await loginAs(first, 'Erste Person');
	const firstPage = await first.newPage();
	await firstPage.goto(`/e/${fullSlug}`);
	await ready(firstPage);
	await firstPage.getByRole('button', { name: 'Verbindlich anmelden' }).click();
	await expect(firstPage.getByText('✓ Du bist angemeldet')).toBeVisible();
	await first.close();

	const second = await loginAs(context, 'Zweite Person');
	addPlace(second.userId, 'Arbeit', 'Bonn-Gronau', 50.72, 7.11);
	await page.goto(`/e/${fullSlug}`);
	await expect(page.getByText('Die Veranstaltung ist leider ausgebucht.')).toBeVisible();

	// After the deadline: answers locked, travel still editable
	const slug = createEvent(owner.userId, { title: 'Herbstfahrt', fields: FIELDS });
	await mockGeocoder(page);
	await page.goto(`/e/${slug}`);
	await ready(page);
	await leg(page, 'Anreise')
		.getByRole('radio', { name: /Noch offen/ })
		.click();
	await leg(page, 'Abreise')
		.getByRole('radio', { name: /Noch offen/ })
		.click();
	await page.getByRole('radio', { name: 'Alles' }).check();
	await page.getByRole('button', { name: 'Verbindlich anmelden' }).click();
	await expect(page.getByText('✓ Du bist angemeldet')).toBeVisible();

	passDeadline(slug);
	await page.reload();
	await ready(page);
	await page.getByRole('button', { name: 'Reise bearbeiten' }).click();
	await expect(page.getByRole('radio', { name: 'Alles' })).toBeDisabled();
	await expect(page.getByText(/Die Anmeldefrist ist vorbei/)).toBeVisible();
	await leg(page, 'Anreise')
		.getByRole('radio', { name: /Suche Mitfahrt/ })
		.click();
	await page.getByRole('button', { name: 'Änderungen speichern' }).click();
	await expect(page.getByText('Deine Anmeldung wurde aktualisiert.')).toBeVisible();
	await expect(page.locator('#registration').getByText(/Suche Mitfahrt/)).toBeVisible();
	await expect(page.locator('#registration').getByText('Alles')).toBeVisible(); // answer kept
});
