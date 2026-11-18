import { expect, test, type Page } from '@playwright/test';
import {
	activeRegistrations,
	createEvent,
	loginAs,
	outbox,
	ready,
	setPassword,
	userByEmail
} from './helpers';

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

async function organizerEvent(browser: import('@playwright/test').Browser, title: string) {
	const ctx = await browser.newContext();
	const owner = await loginAs(ctx, 'Orga Olga');
	await ctx.close();
	return createEvent(owner.userId, { title, fields: FIELDS });
}

const uniqueEmail = (who: string) => `${who}.${Date.now()}.${test.info().project.name}@example.org`;

/** Fills the event's questions (not name and e-mail). */
async function answerQuestions(page: Page) {
	await page
		.getByRole('group', { name: 'Anreise', exact: true })
		.getByRole('radio', { name: /Keine Angabe/ })
		.click();
	await page.getByRole('radio', { name: 'Alles' }).check();
}

/** From the event page through the welcome window to the form without an account. */
async function startAsGuest(page: Page, slug: string, title: string) {
	await page.goto(`/e/${slug}`);
	await ready(page);
	await page.getByRole('link', { name: 'Ich bin dabei' }).click();
	await expect(page.getByRole('heading', { name: `Willkommen zu ${title}!` })).toBeVisible();
	await expect(page.getByText('Lieber ohne Anmeldung fortfahren?')).toBeVisible();
	await page.getByRole('link', { name: 'Ohne Konto weiter' }).click();
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Wer bist du?' })).toBeVisible();
}

test('guests register without an account – name and e-mail at the end', async ({
	page,
	browser
}) => {
	const slug = await organizerEvent(browser, 'Herbstfreizeit');
	await startAsGuest(page, slug, 'Herbstfreizeit');

	// the questions come first, who you are last
	const order = await page
		.locator('#registration form')
		.evaluate((f) =>
			[...f.querySelectorAll('h3, [role="group"] > h3')].map((h) => h.textContent?.trim())
		);
	expect(order.at(-1)).toBe('Wer bist du?');

	// name and e-mail are required
	await answerQuestions(page);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText('Bitte gib deinen Namen an.')).toBeVisible();
	await expect(page.getByText('Bitte gib eine gültige E-Mail-Adresse an.')).toBeVisible();

	const email = uniqueEmail('gast');
	await page.getByLabel('Name', { exact: true }).fill('Gerda Gast');
	await page.getByLabel('E-Mail', { exact: true }).fill(email);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

	// registered, logged in on this device, all info by mail – no confirmation step
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	await expect(
		page.getByText(`Wir haben dir alle Infos zur Veranstaltung an ${email} geschickt.`)
	).toBeVisible();
	const mails = outbox(email);
	expect(mails).toHaveLength(1);
	expect(mails[0].text).toContain('ohne Passwort angemeldet');

	const account = userByEmail(email)!;
	expect(account.name).toBe('Gerda Gast');
	expect(account.email_verified_at).toBeNull();

	// the device stays logged in: rides view and editing work like for everybody
	await page.reload();
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	await page
		.getByRole('link', { name: /Mitfahr/ })
		.first()
		.click();
	await expect(page).toHaveURL(new RegExp(`/e/${slug}/rides`));
});

test('a known e-mail: registered for that account, but this device is not logged in', async ({
	page,
	browser
}) => {
	const slug = await organizerEvent(browser, 'Waldwoche');
	const ownerCtx = await browser.newContext();
	const kim = await loginAs(ownerCtx, 'Kim Konto');

	await startAsGuest(page, slug, 'Waldwoche');
	await answerQuestions(page);
	await page.getByLabel('Name', { exact: true }).fill('Jemand Anderes');
	await page.getByLabel('E-Mail', { exact: true }).fill(kim.email);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	await expect(page.getByText(/gibt es schon ein Konto/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Mit dieser E-Mail anmelden' })).toBeVisible();
	// not logged in: no rides view here, the account's name is untouched
	await page.goto(`/e/${slug}`);
	await expect(page.getByRole('link', { name: 'Ich bin dabei' })).toBeVisible();
	expect(userByEmail(kim.email)!.name).toBe('Kim Konto');
	expect(activeRegistrations(kim.userId, slug)).toBe(1);
	// the owner learns about it by mail
	expect(outbox(kim.email).at(-1)!.subject).toContain('Waldwoche');

	// the account's owner sees the registration
	const ownerPage = await ownerCtx.newPage();
	await ownerPage.goto(`/e/${slug}`);
	await expect(ownerPage.getByText('✓ Du bist dabei!')).toBeVisible();

	// a second time with the same address: it can't be changed without logging in
	await startAsGuest(page, slug, 'Waldwoche');
	await answerQuestions(page);
	await page.getByLabel('Name', { exact: true }).fill('Noch Jemand');
	await page.getByLabel('E-Mail', { exact: true }).fill(kim.email);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(
		page.getByText('Mit dieser E-Mail-Adresse ist schon jemand angemeldet.')
	).toBeVisible();
	await ownerCtx.close();
});

test('the real owner of a guest address takes the account over by magic link', async ({
	page,
	browser
}) => {
	const slug = await organizerEvent(browser, 'Sommerlager');
	const email = uniqueEmail('uebernahme');

	// somebody registers with this address and even sets a password
	await startAsGuest(page, slug, 'Sommerlager');
	await answerQuestions(page);
	await page.getByLabel('Name', { exact: true }).fill('Fremde Person');
	await page.getByLabel('E-Mail', { exact: true }).fill(email);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	setPassword(userByEmail(email)!.id, 'fremdes-passwort');

	// the owner logs in by magic link
	const owner = await browser.newPage();
	await owner.goto('/login');
	await ready(owner);
	await owner.getByLabel('E-Mail').fill(email);
	await owner.getByRole('button', { name: 'Weiter' }).click();
	// a password exists – the owner uses the link instead
	await owner.getByRole('button', { name: /Link/ }).click();
	await expect(owner.getByRole('heading', { name: 'Schau in dein Postfach' })).toBeVisible();
	const mail = outbox(email).at(-1)!;
	const link = new URL(mail.text.match(/https?:\/\/\S+\/auth\/link\?token=\S+/)![0]);
	await owner.goto(link.pathname + link.search);
	await expect(owner.getByRole('heading', { name: 'Meine Veranstaltungen' })).toBeVisible();

	// verified now: the other device is logged out, the password set before is gone
	const account = userByEmail(email)!;
	expect(account.email_verified_at).not.toBeNull();
	expect(account.password_hash).toBeNull();
	await page.goto(`/e/${slug}`);
	await expect(page.getByRole('link', { name: 'Ich bin dabei' })).toBeVisible();
	// the registration itself stays with the account
	await owner.goto(`/e/${slug}`);
	await expect(owner.getByText('✓ Du bist dabei!')).toBeVisible();
	await owner.close();
});
