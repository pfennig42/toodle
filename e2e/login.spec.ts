import { expect, test } from '@playwright/test';
import { createEvent, loginAs, outbox, ready, setPassword } from './helpers';

test('email first: new people get a link, accounts with a password are asked for it', async ({
	browser,
	page
}) => {
	// --- new address → link right away, no password question
	const fresh = `neu.${Date.now()}.${test.info().project.name}@example.org`;
	await page.goto('/login');
	await ready(page);
	await expect(page.getByLabel('Passwort')).toHaveCount(0);
	await page.getByLabel('E-Mail').fill(fresh);
	await page.getByRole('button', { name: 'Weiter' }).click();
	await expect(page.getByRole('heading', { name: 'Schau in dein Postfach' })).toBeVisible();
	await expect(page.getByText(fresh)).toBeVisible();
	expect(outbox(fresh).map((m) => m.subject)).toEqual(['Dein Login-Link für toodle']);

	// --- existing account with password
	const ctx = await browser.newContext();
	const anna = await loginAs(ctx, 'Anna Passwort');
	setPassword(anna.userId, 'geheim-und-lang');

	await page.getByRole('button', { name: 'Andere E-Mail-Adresse' }).click();
	await page.getByLabel('E-Mail').fill(anna.email.toUpperCase());
	await page.getByRole('button', { name: 'Weiter' }).click();
	const password = page.getByLabel('Passwort');
	await expect(password).toBeFocused();
	await expect(page.getByText(anna.email)).toBeVisible();

	await password.fill('falsch-falsch');
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('alert')).toHaveText(/Das Passwort stimmt nicht/);
	await expect(page.getByText(anna.email)).toBeVisible();

	// "change" goes back to step one
	await page.getByRole('button', { name: 'Ändern' }).click();
	await expect(page.getByLabel('Passwort')).toHaveCount(0);
	await page.getByLabel('E-Mail').fill(anna.email);
	await page.getByRole('button', { name: 'Weiter' }).click();

	// link instead of password
	await page.getByRole('button', { name: 'Stattdessen Login-Link per E-Mail' }).click();
	await expect(page.getByRole('heading', { name: 'Schau in dein Postfach' })).toBeVisible();
	expect(outbox(anna.email).map((m) => m.subject)).toContain('Dein Login-Link für toodle');

	// and with the right password
	await page.getByRole('button', { name: 'Andere E-Mail-Adresse' }).click();
	await page.getByLabel('E-Mail').fill(anna.email);
	await page.getByRole('button', { name: 'Weiter' }).click();
	await page.getByLabel('Passwort').fill('geheim-und-lang');
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('heading', { name: 'Meine Veranstaltungen' })).toBeVisible();
});

test('after logging in from an event page you are back at the event, form open', async ({
	browser,
	page
}) => {
	const owner = await loginAs(await browser.newContext(), 'Olga');
	const slug = createEvent(owner.userId, {
		title: 'Herbstfest',
		fields: [{ type: 'long_text', label: 'Essenswunsch' }]
	});
	const paula = await loginAs(await browser.newContext(), 'Paula');
	setPassword(paula.userId, 'geheim-und-lang');

	await page.goto(`/e/${slug}`);
	await ready(page);
	await page.getByRole('link', { name: 'Ich bin dabei' }).click();
	await ready(page);
	await page.getByLabel('E-Mail').fill(paula.email);
	await page.getByRole('button', { name: 'Weiter' }).click();
	await page.getByLabel('Passwort').fill('geheim-und-lang');
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

	// the way back survives the two login steps
	await page.waitForURL(`**/e/${slug}`);
	await ready(page);
	await expect(page.getByLabel('Essenswunsch')).toBeVisible();
	await page.waitForTimeout(500);
	await expect(page.getByLabel('Essenswunsch')).toBeVisible();
});

test('the login link logs you in straight away – a plain fetch (mail scanner) does not use it up', async ({
	browser,
	page,
	request
}) => {
	const ctx = await browser.newContext();
	const rita = await loginAs(ctx, 'Rita');
	await ctx.close();

	await page.goto('/login');
	await ready(page);
	await page.getByLabel('E-Mail').fill(rita.email);
	await page.getByRole('button', { name: 'Weiter' }).click();
	await expect(page.getByRole('heading', { name: 'Schau in dein Postfach' })).toBeVisible();
	const mail = outbox(rita.email).at(-1)!;
	const link = new URL(mail.text.match(/https?:\/\/\S+\/auth\/link\?token=\S+/)![0]);

	// a scanner fetching the page …
	expect((await request.get(link.pathname + link.search)).ok()).toBe(true);

	// … leaves the link usable: opening it logs in without another click
	const fresh = await browser.newPage();
	await fresh.goto(link.pathname + link.search);
	await expect(fresh).toHaveURL('/');
	await expect(
		fresh.getByRole('status').filter({ hasText: 'Hallo Rita, du bist angemeldet.' })
	).toBeVisible();
	await expect(fresh.getByRole('heading', { name: 'Meine Veranstaltungen' })).toBeVisible();

	// the banner shows only once
	await fresh.reload();
	await expect(fresh.getByRole('heading', { name: 'Meine Veranstaltungen' })).toBeVisible();
	await expect(fresh.getByText('du bist angemeldet')).toHaveCount(0);

	// used up now
	await fresh.goto(link.pathname + link.search);
	await expect(
		fresh.getByRole('heading', { name: 'Dieser Link ist schon verbraucht' })
	).toBeVisible();
});
