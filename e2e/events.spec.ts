import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { localDateTime, loginAs, mockGeocoder, ready } from './helpers';

/** The tabs of the event management area. */
const tab = (page: Page, name: string) =>
	page.getByRole('navigation', { name: 'Bereiche der Veranstaltung' }).getByRole('link', { name });

test('organizer creates, builds, publishes, duplicates and deletes an event', async ({
	page,
	context,
	browser
}, testInfo) => {
	const shot = (name: string) =>
		page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });

	await loginAs(context, 'Anna M.');
	await mockGeocoder(page);

	// Dashboard (empty)
	await page.goto('/');
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Meine Veranstaltungen' })).toBeVisible();
	await shot('01-dashboard-empty');
	await page.getByRole('main').getByRole('link', { name: 'Neue Veranstaltung' }).first().click();

	// Create
	await page.getByLabel('Titel', { exact: true }).fill('Sommerfreizeit 2027');
	await page.getByLabel('Beginn', { exact: true }).fill(localDateTime(30, 18));
	await page.getByLabel('Beginn', { exact: true }).blur();
	await expect(page.getByLabel('Ende', { exact: true })).toHaveValue(localDateTime(32, 18)); // suggested end
	await page.getByLabel('Name des Ortes').fill('Jugendhof Waldheim');
	await page.locator('#event-address').fill('Waldheim');
	await page.getByRole('button', { name: /Am Wald 3/ }).click();
	await expect(page.getByText('Für andere sichtbar: Waldheim')).toBeVisible();
	await shot('02-new-event');
	await page.getByRole('button', { name: 'Entwurf anlegen' }).click();
	await page.waitForURL(/\/events\/[^/]+\?created/);
	await ready(page);

	// Overview
	await expect(page.getByRole('heading', { name: 'Sommerfreizeit 2027' })).toBeVisible();
	await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();
	await expect(page.getByText('Entwurf angelegt.')).toBeVisible();
	await shot('03-overview-draft');

	// Form builder: travel field is there by default; add a choice field
	await tab(page, 'Formular').click();
	await expect(page.getByLabel('Frage', { exact: true }).first()).toHaveValue('Anreise & Abreise');
	await expect(page.getByText('Alles gespeichert')).toBeVisible();
	await page.getByRole('button', { name: '+ Frage hinzufügen' }).click();
	await expect(page.getByRole('button', { name: /Reise & Mitfahrt/ })).toBeDisabled();
	await page.getByRole('button', { name: /Einfachauswahl/ }).click();
	await page.getByLabel('Frage', { exact: true }).nth(1).fill('Wie isst du?');
	await page.getByLabel('Antwortmöglichkeiten').fill('Vegetarisch\nVegan\nAlles');
	await expect(page.getByText('Ungespeicherte Änderungen')).toBeVisible();
	await shot('04-builder');
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.getByText('Alles gespeichert')).toBeVisible();

	// Persisted after reload; reorder and save again keeps both fields
	await page.reload();
	await ready(page);
	await expect(page.getByLabel('Frage', { exact: true })).toHaveCount(2);
	await page.getByRole('button', { name: 'Nach oben' }).nth(1).click();
	await expect(page.getByLabel('Frage', { exact: true }).first()).toHaveValue('Wie isst du?');
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.getByText('Alles gespeichert')).toBeVisible();
	await page.reload();
	await ready(page);
	await expect(page.getByLabel('Frage', { exact: true }).first()).toHaveValue('Wie isst du?');
	await expect(page.getByLabel('Frage', { exact: true })).toHaveCount(2);

	// Validation: empty question is rejected by the server
	await page.getByRole('button', { name: '+ Frage hinzufügen' }).click();
	await page.getByRole('button', { name: /Kurzer Text/ }).click();
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.getByText('Frage 3 braucht einen Text.')).toBeVisible();
	await page.getByRole('button', { name: 'Entfernen' }).nth(2).click();

	// Publish
	page.on('dialog', (d) => d.accept()); // unsaved-changes guard
	await tab(page, 'Übersicht').click();
	await page.getByRole('button', { name: 'Veröffentlichen' }).click();
	await expect(page.getByText('Anmeldung offen').first()).toBeVisible();
	await shot('05-overview-published');
	const publicUrl = await page.getByLabel('Öffentlicher Link').inputValue();

	// Public page works without login
	const anon = await browser.newContext({ locale: 'de-DE' });
	const anonPage = await anon.newPage();
	await anonPage.goto(publicUrl);
	await ready(anonPage);
	await expect(anonPage.getByRole('heading', { name: 'Sommerfreizeit 2027' })).toBeVisible();
	await expect(anonPage.getByText('Jugendhof Waldheim').first()).toBeVisible();
	await anonPage.screenshot({ path: testInfo.outputPath('06-public.png'), fullPage: true });

	// Team invite: second person joins via link
	await tab(page, 'Team').click();
	await page.getByRole('button', { name: 'Einladungslink erstellen' }).click();
	const inviteUrl = await page.getByLabel('Einladungslink').inputValue();
	const ben = await browser.newContext({ locale: 'de-DE' });
	await loginAs(ben, 'Ben K.');
	const benPage = await ben.newPage();
	await benPage.goto(inviteUrl);
	await ready(benPage);
	await benPage.getByRole('button', { name: 'Einladung annehmen' }).click();
	await expect(benPage.getByRole('heading', { name: 'Sommerfreizeit 2027' })).toBeVisible();
	await benPage.goto(inviteUrl);
	await ready(benPage); // single use
	await expect(benPage.getByText('Einladung ungültig')).toBeVisible();
	await page.reload();
	await ready(page);
	await expect(page.getByText('Ben K.')).toBeVisible();
	await shot('07-team');

	// Duplicate
	await tab(page, 'Übersicht').click();
	await page.getByRole('button', { name: 'Duplizieren' }).click();
	await expect(page.getByText('Kopie angelegt.')).toBeVisible();
	await expect(page.getByLabel('Titel', { exact: true })).toHaveValue(
		'Sommerfreizeit 2027 (Kopie)'
	);
	await tab(page, 'Formular').click();
	await expect(page.getByLabel('Frage', { exact: true })).toHaveCount(2);

	// Dashboard lists both
	await page.goto('/');
	await ready(page);
	await expect(page.getByRole('link', { name: /Sommerfreizeit 2027/ })).toHaveCount(2);
	await shot('08-dashboard');

	// Delete the copy (needs the exact title)
	await page.getByRole('link', { name: /\(Kopie\)/ }).click();
	await page.getByLabel(/Zur Bestätigung/).fill('falsch');
	await page.getByRole('button', { name: 'Endgültig löschen' }).click();
	await expect(page.getByText('Der Titel stimmt nicht überein.')).toBeVisible();
	await page.getByLabel(/Zur Bestätigung/).fill('Sommerfreizeit 2027 (Kopie)');
	await page.getByRole('button', { name: 'Endgültig löschen' }).click();
	await expect(page.getByRole('link', { name: /Sommerfreizeit 2027/ })).toHaveCount(1);

	await anon.close();
	await ben.close();
});

test('drafts and other people’s events are not accessible', async ({ page, context, browser }) => {
	await loginAs(context, 'Clara');
	await mockGeocoder(page);
	await page.goto('/events/new');
	await ready(page);
	await page.getByLabel('Titel', { exact: true }).fill('Geheimer Entwurf');
	await page.getByLabel('Beginn', { exact: true }).fill(localDateTime(10, 10));
	await page.getByLabel('Ende', { exact: true }).fill(localDateTime(10, 16));
	await page.getByRole('button', { name: 'Entwurf anlegen' }).click();
	await page.waitForURL(/\/events\/[^/]+\?created/);
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Geheimer Entwurf' })).toBeVisible();
	await expect(page.getByText('Zum Veröffentlichen fehlt noch die Adresse.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled();
	const manageUrl = page.url();
	const publicUrl = await page.getByLabel('Öffentlicher Link').inputValue();

	const other = await browser.newContext({ locale: 'de-DE' });
	await loginAs(other, 'Mallory');
	const otherPage = await other.newPage();
	expect((await otherPage.goto(publicUrl))?.status()).toBe(404);
	expect((await otherPage.goto(manageUrl))?.status()).toBe(404);
	await other.close();
});
