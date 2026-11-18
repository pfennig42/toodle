import { expect, test } from '@playwright/test';
import { loginAs, ready } from './helpers';

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
