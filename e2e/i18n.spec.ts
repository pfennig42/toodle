import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test.use({ locale: 'nl-NL' });

test('browser language is used; the language can be switched and is remembered', async ({
	page
}) => {
	await page.goto('/');
	await ready(page);
	await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
	await expect(page.getByText('Aanmelden – en zien wie er meerijdt.')).toBeVisible();

	await page.getByRole('button', { name: 'Instellingen' }).click();
	await page.getByRole('combobox', { name: 'Taal' }).selectOption('fr');
	await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
	await expect(page.getByText('S’inscrire – et voir qui fait le trajet.')).toBeVisible();

	await page.reload();
	await expect(page.getByText('S’inscrire – et voir qui fait le trajet.')).toBeVisible();
});
