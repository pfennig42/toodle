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

test('participant looks for a ride with alternative pick-up points, edits and withdraws', async ({
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
	await expect(anonPage.getByRole('link', { name: 'Ich bin dabei' })).toHaveAttribute(
		'href',
		`/login?next=${encodeURIComponent(`/e/${slug}`)}`
	);
	await anon.close();

	const lea = await loginAs(context, 'Lea S.');
	addPlace(lea.userId, 'Zuhause', 'Köln-Ehrenfeld', 50.94, 6.94);
	await mockGeocoder(page);
	await page.goto(`/e/${slug}`);
	await ready(page);

	// Name and email come from the account: shown prefilled, not editable here
	const account = page.locator('#registration dl').first();
	await expect(account.getByText('Lea S.', { exact: true })).toBeVisible();
	await expect(account.getByText(lea.email)).toBeVisible();
	// plain text, no inputs – password managers (e.g. Bitwarden) would hook into those
	await expect(account.locator('input')).toHaveCount(0);

	// Submitting without choices shows errors
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText('Bitte prüfe die markierten Angaben.')).toBeVisible();
	await expect(leg(page, 'Anreise').getByText(/Bitte wähle aus, wie du an/)).toBeVisible();
	await expect(page.getByText('Bitte ausfüllen.')).toBeVisible();

	// Arrival: looking for a ride – home (saved place, suggested) or one of two stations
	await leg(page, 'Anreise')
		.getByRole('radio', { name: /Suche Mitfahrt/ })
		.click();
	await expect(leg(page, 'Anreise').getByText('📍 Zuhause')).toBeVisible();
	await expect(leg(page, 'Anreise').getByLabel('An welchem Tag?')).toHaveValue(
		/^\d{4}-\d{2}-\d{2}$/
	); // event's first day
	await leg(page, 'Anreise').getByRole('button', { name: '+ Adresse oder Bahnhof' }).click();
	await leg(page, 'Anreise')
		.getByPlaceholder('Adresse oder Bahnhof suchen …')
		.fill('Waldheim Bahnhof');
	await leg(page, 'Anreise')
		.getByRole('button', { name: /Waldheim Bahnhof/ })
		.click();
	await leg(page, 'Anreise').getByLabel('Uhrzeit (optional)').nth(1).fill('16:40');
	await leg(page, 'Anreise').getByRole('button', { name: '+ Adresse oder Bahnhof' }).click();
	await leg(page, 'Anreise').getByPlaceholder('Adresse oder Bahnhof suchen …').fill('Talhausen');
	await leg(page, 'Anreise')
		.getByRole('button', { name: /Talhausen Bf/ })
		.click();

	// The return trip took over the arrival …
	await expect(leg(page, 'Abreise').getByRole('radio', { name: /Suche Mitfahrt/ })).toBeChecked();
	await expect(leg(page, 'Abreise').getByText('Talhausen Bf')).toBeVisible();
	// … until changed: by car, already full → where from / when don't matter
	await leg(page, 'Abreise').getByRole('radio', { name: /Auto/ }).click();
	await leg(page, 'Abreise').getByRole('radio', { name: 'Nein' }).click();
	await expect(leg(page, 'Abreise').getByRole('combobox')).toHaveCount(0);
	await expect(leg(page, 'Abreise').getByLabel(/Abfahrt/)).toHaveCount(0);
	// arrival changes no longer touch the return trip
	await leg(page, 'Anreise').getByRole('button', { name: 'Entfernen' }).first().click();
	await expect(leg(page, 'Abreise').getByRole('radio', { name: 'Nein' })).toBeChecked();

	await page.getByRole('radio', { name: 'Vegan' }).check();
	await page.getByLabel(/Kommentar/).fill('Komme evtl. etwas später');
	// no contact option yet → asked right here, saved to the profile
	const contact = page.getByRole('group', { name: /Wie erreichen dich andere für Mitfahrten/ });
	await contact.getByRole('combobox').selectOption('signal');
	await contact.getByLabel('Nummer / Name').fill('+49 170 1234567');
	await shot('01-form-filled');
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

	// Summary
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	const summary = page.locator('#registration');
	await expect(summary.getByText(/Abholung:/)).toContainText('Waldheim Bahnhof ~16:40');
	await expect(summary.getByText(/Abholung:/)).toContainText('oder');
	await expect(summary.getByText(/Abholung:/)).toContainText('Talhausen Bf');
	await expect(summary.getByText(/Abholung:/)).not.toContainText('Zuhause'); // removed above
	await expect(summary.getByText('Kein Platz frei')).toBeVisible();
	await expect(summary.getByText('Vegan')).toBeVisible();
	await expect(summary.getByText(/Kontaktweg/)).toHaveCount(0); // contact given in the form
	await shot('02-summary');

	// Edit: car has room again – values are prefilled
	await page.getByRole('button', { name: 'Anmeldung bearbeiten' }).click();
	await expect(leg(page, 'Anreise').getByText('Talhausen Bf', { exact: true })).toBeVisible();
	await leg(page, 'Abreise').getByRole('radio', { name: 'Ja' }).click();
	// now the start matters – the saved place is suggested
	await expect(leg(page, 'Abreise').getByRole('combobox')).toHaveValue(/.+/);
	await page.getByRole('button', { name: 'Änderungen speichern' }).click();
	await expect(page.getByText('Deine Anmeldung wurde aktualisiert.')).toBeVisible();
	await expect(summary.getByText('Noch Platz frei')).toBeVisible();

	// Dashboard lists the registration
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Du bist dabei' })).toBeVisible();
	await page.getByRole('link', { name: /Pfingstlager/ }).click();

	// Withdraw
	await page.getByText('Abmelden', { exact: true }).click();
	await page.getByRole('button', { name: 'Ja, abmelden' }).click();
	await expect(page.getByText('Du hast dich abgemeldet.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
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
	await firstPage.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(firstPage.getByText('✓ Du bist dabei!')).toBeVisible();
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
		.getByRole('radio', { name: /Keine Angabe/ })
		.click();
	await leg(page, 'Abreise')
		.getByRole('radio', { name: /Keine Angabe/ })
		.click();
	await page.getByRole('radio', { name: 'Alles' }).check();
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();

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
