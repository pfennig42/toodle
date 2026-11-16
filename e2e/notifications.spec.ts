import { expect, test } from '@playwright/test';
import {
	ageRegistration,
	createEvent,
	eventIdOf,
	loginAs,
	outbox,
	ready,
	registerDirect
} from './helpers';

const KOELN = { area: 'Köln-Ehrenfeld', lat: 50.94, lon: 6.96 };

test('confirmation, ride hints, ride links, reminders and unsubscribing', async ({
	browser,
	page,
	context
}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'server-side behaviour – once is enough');

	const olga = await loginAs(context, 'Olga Orga');
	const leaCtx = await browser.newContext({ locale: 'de-DE' });
	const lea = await loginAs(leaCtx, 'Lea');
	const anna = await loginAs(await browser.newContext(), 'Anna');
	const udo = await loginAs(await browser.newContext(), 'Udo');

	// --- confirmation mail after registering through the form
	const simple = createEvent(olga.userId, {
		title: 'Spieleabend',
		fields: [{ type: 'short_text', label: 'Lieblingsspiel' }]
	});
	const leaPage = await leaCtx.newPage();
	await leaPage.goto(`/e/${simple}`);
	await ready(leaPage);
	await leaPage.getByLabel('Lieblingsspiel').fill('Doppelkopf');
	await leaPage.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect
		.poll(() => outbox(lea.email).map((m) => m.subject))
		.toContain('Angemeldet: Spieleabend');
	const confirm = outbox(lea.email).find((m) => m.subject === 'Angemeldet: Spieleabend')!;
	expect(confirm.text).toContain('Hallo Lea,');
	expect(confirm.text).toContain(`Zur Veranstaltung: http://localhost:4317/e/${simple}`);
	expect(confirm.text).toMatch(
		/Anmeldebestätigungen abbestellen: http:\/\/localhost:4317\/unsubscribe\//
	);

	// --- ride hints from the background job: to the seeker and to the driver, once
	const camp = createEvent(olga.userId, {
		title: 'Sommerlager',
		fields: [{ type: 'travel', label: 'Reise', config: { directions: ['to'] } }]
	});
	registerDirect(camp, anna.userId, { to: { mode: 'car', ...KOELN } });
	registerDirect(camp, lea.userId, { to: { mode: 'seeking', ...KOELN } });

	await expect
		.poll(() => outbox(lea.email).map((m) => m.subject), { timeout: 10_000 })
		.toContain('Mitfahrgelegenheit für „Sommerlager“');
	await expect
		.poll(() => outbox(anna.email).map((m) => m.subject), { timeout: 10_000 })
		.toContain('Sommerlager: Auf deiner Strecke wird eine Mitfahrt gesucht');
	const hint = outbox(lea.email).find((m) => m.subject.startsWith('Mitfahrgelegenheit'))!;
	expect(hint.text).toContain('Anreise: Anna (Köln-Ehrenfeld) fährt mit dem Auto');
	expect(hint.text).toContain(`http://localhost:4317/e/${camp}/rides?dir=to`);
	// a few more job runs must not repeat it
	await page.waitForTimeout(2500);
	expect(outbox(lea.email).filter((m) => m.subject.startsWith('Mitfahrgelegenheit'))).toHaveLength(
		1
	);

	// --- organizer connects Lea with Anna → both get told who did it
	await page.goto(`/events/${eventIdOf(camp)}/rides`);
	await ready(page);
	const select = page.getByRole('combobox', { name: 'Fahrt für Lea wählen' });
	await select.selectOption({ label: (await select.locator('option').first().textContent())! });
	await page.getByRole('button', { name: 'Zuordnen' }).click();
	await expect
		.poll(() => outbox(lea.email).map((m) => m.subject))
		.toContain('Sommerlager: Du fährst bei Anna mit');
	await expect
		.poll(() => outbox(anna.email).map((m) => m.subject))
		.toContain('Sommerlager: Lea fährt bei dir mit');
	expect(outbox(lea.email).find((m) => m.subject.includes('Du fährst'))!.text).toContain(
		'Eingetragen von Olga Orga.'
	);
	expect(outbox(olga.email)).toHaveLength(0);

	// --- reminder for open travel shortly before the event, only once
	const soon = createEvent(olga.userId, {
		title: 'Wochenende',
		startsInDays: 3,
		fields: [{ type: 'travel', label: 'Reise', config: { directions: ['to', 'from'] } }]
	});
	ageRegistration(registerDirect(soon, udo.userId, { to: { mode: 'undecided' } }), 3);
	await expect
		.poll(() => outbox(udo.email).map((m) => m.subject), { timeout: 10_000 })
		.toContain('Wie kommst du zu „Wochenende“?');
	await page.waitForTimeout(2000);
	expect(outbox(udo.email).filter((m) => m.subject.startsWith('Wie kommst'))).toHaveLength(1);

	// --- unsubscribe link works without login; profile reflects it
	const url = /Mitfahr-Hinweise abbestellen: (\S+)/.exec(hint.text)![1];
	const anon = await (await browser.newContext()).newPage();
	await anon.goto(url);
	await ready(anon);
	await expect(anon.getByText(`„Mitfahr-Hinweise“ für ${lea.email} abbestellen?`)).toBeVisible();
	await anon.getByRole('button', { name: 'Abbestellen' }).click();
	await expect(
		anon.getByText('Erledigt. Du bekommst keine „Mitfahr-Hinweise“ mehr.')
	).toBeVisible();

	await leaPage.goto('/profile');
	await ready(leaPage);
	await expect(leaPage.getByRole('checkbox', { name: /Mitfahr-Hinweise/ })).not.toBeChecked();
	await expect(leaPage.getByRole('checkbox', { name: 'Anmeldebestätigungen' })).toBeChecked();
	await leaPage.getByRole('checkbox', { name: /Erinnerungen/ }).uncheck();
	await leaPage
		.locator('form', { has: leaPage.getByRole('checkbox', { name: /Erinnerungen/ }) })
		.getByRole('button', { name: 'Speichern' })
		.click();
	await expect(leaPage.getByRole('status').filter({ hasText: 'Gespeichert' })).toBeVisible();
	await leaPage.reload();
	await expect(leaPage.getByRole('checkbox', { name: /Erinnerungen/ })).not.toBeChecked();

	// a bogus token shows nothing
	expect((await anon.goto('/unsubscribe/nope?k=rides'))!.status()).toBe(404);
});

test('own pages stay readable offline; logging out removes them', async ({
	page,
	context
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'service worker behaviour – once is enough');
	const me = await loginAs(context, 'Ole Offline');
	const owner = await loginAs(await context.browser()!.newContext(), 'Owner');
	const slug = createEvent(owner.userId, {
		title: 'Hüttenwochenende',
		fields: [{ type: 'travel', label: 'Reise', config: { directions: ['to'] } }]
	});
	registerDirect(slug, me.userId, { to: { mode: 'car', ...KOELN } });

	await page.goto('/');
	await ready(page);
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	// now controlled by the service worker – visit the pages once more so they are stored
	await page.reload();
	await page.goto(`/e/${slug}`);
	await ready(page);
	await page.goto(`/e/${slug}/rides`);
	await ready(page);

	await context.setOffline(true);
	await page.goto(`/e/${slug}`);
	await expect(page.getByRole('heading', { name: 'Hüttenwochenende' })).toBeVisible();
	await ready(page);
	await expect(page.getByRole('status').filter({ hasText: 'Offline' })).toBeVisible();
	await page.goto(`/e/${slug}/rides`);
	await expect(page.getByRole('heading', { name: 'Du bist offline' })).toHaveCount(0);
	await expect(page.getByText('Hüttenwochenende').first()).toBeVisible();
	// never opened → friendly offline page
	await page.goto('/profile');
	await expect(page.getByRole('heading', { name: 'Du bist offline' })).toBeVisible();

	// log out → the stored copy is gone
	await context.setOffline(false);
	await page.goto('/profile');
	await ready(page);
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await page.waitForURL('/');
	await page.waitForTimeout(300);
	await context.setOffline(true);
	await page.goto(`/e/${slug}`);
	await expect(page.getByRole('heading', { name: 'Du bist offline' })).toBeVisible();
});
