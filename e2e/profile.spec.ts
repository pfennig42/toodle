import { expect, test } from '@playwright/test';
import { loginAs, outbox, ready, userByEmail } from './helpers';

test('several ways to be reached can be saved in the profile', async ({ context, page }) => {
	await loginAs(context, 'Kai');
	await page.goto('/profile');
	await ready(page);
	const section = page.locator('section', {
		has: page.getByRole('heading', { name: 'Kontaktwege' })
	});

	// nothing yet: the form is open right away
	await section.getByRole('combobox').selectOption('phone');
	await section.getByLabel('Nummer / Name').fill('+49 170 1234567');
	await section.getByRole('button', { name: 'Hinzufügen' }).click();
	await expect(section.getByText('+491701234567')).toBeVisible();

	// then behind "add another", with a kind that isn't used yet
	await expect(section.getByLabel('Nummer / Name')).toHaveCount(0);
	await section.getByRole('button', { name: /Weiteren Kontaktweg hinzufügen/ }).click();
	await expect(section.getByRole('combobox')).toHaveValue('signal');
	await expect(section.getByLabel('Nummer / Name')).toBeFocused();
	await section.getByLabel('Nummer / Name').fill('kai.42');
	await section.getByRole('button', { name: 'Hinzufügen' }).click();
	await expect(section.getByText('kai.42')).toBeVisible();
	await expect(section.getByText('+491701234567')).toBeVisible();

	// cancel closes the form again
	await section.getByRole('button', { name: /Weiteren Kontaktweg hinzufügen/ }).click();
	await section.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(section.getByLabel('Nummer / Name')).toHaveCount(0);

	// another messenger: the name of the service is asked as well
	await section.getByRole('button', { name: /Weiteren Kontaktweg hinzufügen/ }).click();
	await section.getByRole('combobox').selectOption('other');
	await expect(section.getByLabel('Welcher Dienst?')).toBeVisible();
	await section.getByLabel('Welcher Dienst?').fill('Threema');
	await section.getByLabel('Nummer / Name').fill('ECHO4242');
	await section.getByRole('button', { name: 'Hinzufügen' }).click();
	await expect(section.getByRole('listitem').filter({ hasText: 'ECHO4242' })).toContainText(
		'Threema'
	);

	// all stay after a reload
	await page.reload();
	await expect(section.getByRole('listitem')).toHaveCount(3);
});

test('changing the e-mail address needs a click on a link sent to the new one', async ({
	page,
	context,
	browser
}) => {
	const kim = await loginAs(context, 'Kim');
	const other = await loginAs(await browser.newContext(), 'Schon Da');
	const fresh = `kim.neu.${Date.now()}@example.org`;

	await page.goto('/profile');
	await ready(page);
	const change = async (email: string) => {
		await page.getByText('E-Mail-Adresse ändern').click();
		await page.getByLabel('Neue E-Mail-Adresse').fill(email);
		await page.getByRole('button', { name: 'Link senden' }).click();
		await expect(page.getByText(`Schau in das Postfach von ${email}`)).toBeVisible();
	};

	// an address that already has an account: same answer here, a note (no link) there
	await change(other.email);
	await expect
		.poll(() => outbox(other.email).map((m) => m.subject))
		.toContain('Neue E-Mail-Adresse für toodle bestätigen');
	expect(outbox(other.email).at(-1)!.text).not.toContain('/auth/email');

	await page.reload();
	await ready(page);
	await change(fresh);
	await expect.poll(() => outbox(fresh).length).toBe(1);
	const link = outbox(fresh)[0].text.match(/https?:\/\/\S+\/auth\/email\?token=\S+/)![0];
	expect(userByEmail(kim.email)).toBeTruthy(); // nothing changed yet

	await page.goto(link);
	await ready(page);
	await page.getByRole('button', { name: 'Ja, Adresse ändern' }).click();
	await expect(page.getByText(`Dein Konto läuft jetzt auf ${fresh}.`)).toBeVisible();
	expect(userByEmail(fresh)?.id).toBe(kim.userId);
	await expect
		.poll(() => outbox(kim.email).map((m) => m.subject))
		.toContain('Deine E-Mail-Adresse bei toodle wurde geändert');

	// the link works only once
	await page.goto(link);
	await expect(page.getByText(/abgelaufen oder wurde schon benutzt/)).toBeVisible();
});
