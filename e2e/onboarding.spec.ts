import { expect, test } from '@playwright/test';
import { loginAs, ready } from './helpers';

test('first login asks only for the name (and optionally a password)', async ({
	page,
	context
}) => {
	await loginAs(context, 'Neu', false);
	await page.goto('/');
	await page.waitForURL(/\/onboarding/);
	await ready(page);

	await expect(page.getByRole('heading', { name: 'Willkommen bei toodle' })).toBeVisible();
	// account only – no places, no contacts here
	await expect(page.getByLabel('Adresse')).toHaveCount(0);
	await expect(page.getByLabel('Nummer / Name')).toHaveCount(0);

	await page.getByLabel('Wie heißt du?').fill('Nora N.');
	await page.getByLabel(/Passwort/).fill('kurz');
	await page.getByRole('button', { name: "Los geht's" }).click();
	// too short: the browser already refuses (minlength), we stay here
	await expect(page).toHaveURL(/\/onboarding/);
	expect(
		await page.getByLabel(/Passwort/).evaluate((el: HTMLInputElement) => el.validity.valid)
	).toBe(false);
	await page.getByLabel(/Passwort/).fill('');
	await page.getByRole('button', { name: "Los geht's" }).click();
	await page.waitForURL('/');
	await expect(page.getByRole('heading', { name: 'Meine Veranstaltungen' })).toBeVisible();
});
