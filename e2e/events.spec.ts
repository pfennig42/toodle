import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { localDateTime, loginAs, mockGeocoder, pickDates, ready, slugOf } from './helpers';

/** The tabs of the event management area. */
const tab = (page: Page, name: string) =>
	page.getByRole('navigation', { name: 'Bereiche der Veranstaltung' }).getByRole('link', { name });

/** Settings › General / Eckdaten / Formular / Team */
async function settings(page: Page, name: string) {
	await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
	await page.getByRole('navigation', { name: 'Einstellungen' }).getByRole('link', { name }).click();
	await ready(page);
}

test('organizer creates, builds, publishes, duplicates and deletes an event', async ({
	page,
	context,
	browser
}, testInfo) => {
	const shot = (name: string) =>
		page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
	/**
	 * On phones the bottom navigation reappears when an input loses focus. A simulated mouse
	 * click (press → blur → nav appears → release) can then miss; real taps pick their target
	 * on touch, so tap like a person would.
	 */
	const press = (l: Locator) => (testInfo.project.name === 'mobile' ? l.tap() : l.click());

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
	// a weekend in the range calendar – the time of day is optional
	await ready(page);
	await pickDates(page, localDateTime(30, 18).slice(0, 10), localDateTime(32, 18).slice(0, 10));
	await page.getByLabel('Beginn: Uhrzeit angeben').click();
	await page.getByLabel('Beginn: Uhrzeit (optional)').fill('18:00');
	await page.getByLabel('Name des Ortes').fill('Jugendhof Waldheim');
	await page.locator('#event-address').fill('Waldheim');
	await page.getByRole('button', { name: /Am Wald 3/ }).click();
	await expect(page.getByText('Für andere sichtbar: Waldheim')).toBeVisible();
	await shot('02-new-event');
	await page.getByRole('button', { name: 'Weiter zum Anmeldeformular' }).click();
	await page.waitForURL(/\/events\/new\/[^/?]+$/);
	await ready(page);

	// Step 2: form builder – name, email (prefilled) and comment are listed; travel is a switch
	await expect(page.getByRole('list', { name: 'Schritte' })).toBeVisible();
	for (const fixed of ['Name', 'E-Mail', 'Kommentar']) {
		await expect(page.getByRole('listitem').filter({ hasText: fixed }).first()).toBeVisible();
	}
	await expect(page.getByRole('switch', { name: 'Reise & Mitfahrt abfragen' })).toBeChecked();
	await page.getByRole('button', { name: 'Anpassen' }).click();
	await expect(page.getByLabel('Überschrift')).toHaveValue('Anreise & Abreise');
	await press(page.getByRole('button', { name: 'OK', exact: true }));

	// add a choice question
	await page.getByText('+ Frage hinzufügen').click();
	await expect(page.getByText('Was möchtest du von deinen Gästen wissen?')).toBeVisible();
	await expect(page.getByRole('button', { name: /Reise & Mitfahrt/ })).toHaveCount(0);
	await page.getByRole('button', { name: /Eine Antwort auswählen/ }).click();
	await page.getByLabel('Deine Frage').fill('Wie isst du?');
	await page.getByLabel('Antworten zur Auswahl').fill('Vegetarisch\nVegan\nAlles');
	await press(page.getByRole('button', { name: 'OK', exact: true }));
	const row = page.getByRole('button', { name: /Wie isst du\?/ });
	await expect(row).toHaveAttribute('aria-expanded', 'false');

	// the header opens and closes a question
	await row.click();
	await expect(page.getByLabel('Deine Frage')).toHaveValue('Wie isst du?');
	await expect(row).toHaveAttribute('aria-expanded', 'true');
	await press(row);
	await expect(page.getByLabel('Deine Frage')).toHaveCount(0);

	// a yes/no question with a link, e.g. to the privacy policy
	await page.getByText('+ Frage hinzufügen').click();
	await page.getByRole('button', { name: /Ja oder Nein/ }).click();
	await page.getByLabel('Deine Frage').fill('Ich habe die Datenschutzerklärung gelesen');
	// explanation and links can be added – and removed again
	await page.getByRole('button', { name: '+ Erklärung' }).click();
	await page.getByLabel('Erklärung für deine Gäste').fill('wird gleich wieder entfernt');
	await page.getByRole('button', { name: 'Erklärung entfernen' }).click();
	await expect(page.getByLabel('Erklärung für deine Gäste')).toHaveCount(0);
	await expect(page.getByRole('button', { name: '+ Erklärung' })).toBeFocused();
	await page.getByRole('button', { name: '+ Link' }).click();
	await expect(page.getByLabel('Link-Adresse')).toBeFocused();
	await page.getByLabel('Link-Adresse').fill('kein link');
	await page.getByRole('button', { name: 'Fertig', exact: true }).click();
	await expect(page.getByText('Das ist keine gültige Webadresse.')).toBeVisible();
	await page.getByLabel('Link-Adresse').fill('example.org/datenschutz');
	await page.getByLabel('Linktext').fill('Datenschutzerklärung');
	await page.getByRole('button', { name: '+ Link' }).click();
	await page.getByLabel('Link-Adresse').nth(1).fill('example.org/agb');
	await page.getByRole('button', { name: '+ Link' }).click();
	await page.getByLabel('Link-Adresse').nth(2).fill('example.org/weg');
	await page.getByRole('button', { name: 'Link entfernen' }).nth(2).click();
	await expect(page.getByLabel('Link-Adresse')).toHaveCount(2);
	await press(page.getByRole('button', { name: 'OK', exact: true }));

	// the preview shows the form as guests see it
	await page.getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('So sieht es für deine Gäste aus:')).toBeVisible();
	await expect(page.getByText('Vegetarisch')).toBeVisible();
	await expect(page.getByRole('link', { name: /^Datenschutzerklärung/ })).toHaveAttribute(
		'href',
		'https://example.org/datenschutz'
	);
	await expect(page.getByRole('link', { name: /^example\.org/ })).toHaveAttribute(
		'href',
		'https://example.org/agb'
	);
	await expect(page.locator('a[href="https://example.org/weg"]')).toHaveCount(0);
	await page.getByRole('button', { name: 'Bearbeiten' }).click();
	await shot('03-setup-form');

	// Finish: saves the form and publishes
	// Saving must not trigger the "unsaved changes" question (it did once: the redirect after
	// "Fertig" looked like leaving the page).
	const dialogs: string[] = [];
	page.on('dialog', (d) => {
		dialogs.push(d.message());
		return d.dismiss();
	});
	await page.getByRole('button', { name: 'Fertig', exact: true }).click();
	await page.waitForURL(/\/events\/[^/]+\?published/);
	await ready(page);

	// Overview: published right away, no separate confirmation
	await expect(page.getByRole('heading', { name: 'Sommerfreizeit 2027' })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Deine Veranstaltung ist online!' })
	).toBeVisible();
	// sharing is offered right away
	await expect(page.getByRole('button', { name: 'Link teilen' })).toBeVisible();
	await expect(page.getByLabel('Öffentlicher Link')).toHaveValue(/\/e\/[a-z0-9]+$/);
	// settings are not mixed into the overview
	await expect(page.getByRole('button', { name: 'Duplizieren' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Endgültig löschen' })).toHaveCount(0);
	await expect(page.getByText('Anmeldung offen').first()).toBeVisible();
	// start with time, end without → "…, 18:00 – So., 18. Juli"
	const when = page.locator('p', { hasText: '18:00 –' });
	await expect(when).toBeVisible();
	await expect(when).not.toHaveText(/–.*\d{2}:\d{2}/);
	await shot('04-overview-published');

	// The form tab shows what was set up
	await settings(page, 'Formular');
	await expect(page.getByRole('button', { name: /Wie isst du\?/ })).toBeVisible();
	await expect(page.getByText('Alles gespeichert')).toBeVisible();

	// Travel can be switched off and on again – its settings come back
	const travelSwitch = page.getByRole('switch', { name: 'Reise & Mitfahrt abfragen' });
	await travelSwitch.uncheck();
	await expect(
		page.getByText(/Ohne Reiseangaben gibt es keine Mitfahrgelegenheiten/)
	).toBeVisible();
	await press(page.getByRole('button', { name: 'Speichern' }));
	await expect(page.getByText('Alles gespeichert')).toBeVisible();
	await page.reload();
	await ready(page);
	await expect(travelSwitch).not.toBeChecked();
	await travelSwitch.check();
	await page.getByRole('button', { name: 'Anpassen' }).click();
	await expect(page.getByLabel('Überschrift')).toHaveValue('Anreise & Abreise');
	await press(page.getByRole('button', { name: 'Speichern' }));
	await expect(page.getByText('Alles gespeichert')).toBeVisible();
	await page.reload();
	await ready(page);
	await expect(travelSwitch).toBeChecked();

	// An empty question is caught before saving and opened for editing
	await page.getByText('+ Frage hinzufügen').click();
	await page.getByRole('button', { name: /Kurze Antwort/ }).click();
	await press(page.getByRole('button', { name: 'Speichern' }));
	await expect(page.getByRole('alert')).toHaveText('Hier fehlt noch die Frage.');
	await expect(page.getByLabel('Deine Frage')).toBeFocused();
	await press(page.getByRole('button', { name: 'Frage löschen' }));
	await expect(page.getByText('Alles gespeichert')).toBeVisible();

	expect(dialogs).toEqual([]);

	// …but really leaving with unsaved changes still asks (dismissed → stay)
	await travelSwitch.uncheck();
	await tab(page, 'Übersicht').click();
	await expect.poll(() => dialogs.length).toBe(1);
	expect(dialogs[0]).toContain('ungespeicherte Änderungen');
	await expect(page.getByText('Ungespeicherte Änderungen')).toBeVisible();
	await travelSwitch.check();
	await expect(page.getByText('Alles gespeichert')).toBeVisible();

	// Public link
	await tab(page, 'Übersicht').click();
	await ready(page);
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
	await settings(page, 'Team');
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
	await settings(page, 'Allgemein');
	await page.getByRole('button', { name: 'Duplizieren' }).click();
	await expect(page.getByText('Kopie angelegt.')).toBeVisible();
	await expect(page.getByLabel('Titel', { exact: true })).toHaveValue(
		'Sommerfreizeit 2027 (Kopie)'
	);
	await settings(page, 'Formular');
	await expect(page.getByRole('switch', { name: 'Reise & Mitfahrt abfragen' })).toBeChecked();
	await expect(page.getByRole('button', { name: /Wie isst du\?/ })).toBeVisible();

	// Dashboard lists both
	await page.goto('/');
	await ready(page);
	await expect(page.getByRole('link', { name: /Sommerfreizeit 2027/ })).toHaveCount(2);
	await shot('08-dashboard');

	// Delete the copy (needs the exact title)
	await page.getByRole('link', { name: /\(Kopie\)/ }).click();
	await ready(page);
	await settings(page, 'Allgemein');
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
	// a single day: the same day twice
	await pickDates(page, localDateTime(10, 10).slice(0, 10), localDateTime(10, 16).slice(0, 10));
	await page.getByLabel('Beginn: Uhrzeit angeben').click();
	await page.getByLabel('Beginn: Uhrzeit (optional)').fill('10:00');
	await page.getByLabel('Ende: Uhrzeit angeben').click();
	await page.getByLabel('Ende: Uhrzeit (optional)').fill('16:00');
	// the address is required when creating – the event is published at the end
	await page.getByRole('button', { name: 'Weiter zum Anmeldeformular' }).click();
	await expect(page.getByText('Bitte wähle den Ort aus den Suchergebnissen.')).toBeVisible();
	await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Geheimer Entwurf');
	await page.locator('#event-address').fill('Waldheim');
	await page.getByRole('button', { name: /Am Wald 3/ }).click();
	await page.getByRole('button', { name: 'Weiter zum Anmeldeformular' }).click();
	await page.waitForURL(/\/events\/new\/[^/?]+$/);
	await ready(page);

	// back to step 1 edits the same event
	await page.getByRole('link', { name: '← Zurück zu den Eckdaten' }).click();
	await ready(page);
	await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Geheimer Entwurf');
	await page.getByLabel('Titel', { exact: true }).fill('Geheimer Entwurf 2');
	await page.getByRole('button', { name: 'Weiter zum Anmeldeformular' }).click();
	await page.waitForURL(/\/events\/new\/[^/?]+$/);
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Geheimer Entwurf 2' })).toBeVisible();

	// abandoned at step 2 → stays a private draft that can be continued
	const id = page.url().split('/').pop()!;
	await page.goto(`/events/${id}`);
	await ready(page);
	await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Einrichtung fortsetzen' })).toBeVisible();
	await page.goto('/');
	await ready(page);
	await expect(page.getByRole('link', { name: /Geheimer Entwurf/ })).toHaveCount(1);
	await page.goto(`/events/${id}`);
	await ready(page);
	const manageUrl = page.url();
	const publicUrl = `/e/${slugOf(id)}`;

	const other = await browser.newContext({ locale: 'de-DE' });
	await loginAs(other, 'Mallory');
	const otherPage = await other.newPage();
	expect((await otherPage.goto(publicUrl))?.status()).toBe(404);
	expect((await otherPage.goto(manageUrl))?.status()).toBe(404);
	await other.close();
});
