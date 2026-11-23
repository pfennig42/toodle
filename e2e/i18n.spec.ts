import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test.use({ locale: 'nl-NL' });

test('browser language is used; the language can be switched and is remembered', async ({
	page
}) => {
	await page.goto('/');
	await ready(page);
	await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
	// the landing page itself is German-only for now – the app around it is translated
	await expect(page.getByRole('link', { name: 'Colofon' })).toBeVisible();

	await page.getByRole('button', { name: 'Taal & weergave' }).click();
	await page.getByRole('combobox', { name: 'Taal' }).selectOption('fr');
	await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
	await expect(page.getByRole('link', { name: 'Mentions légales' })).toBeVisible();

	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
	await expect(page.getByRole('link', { name: 'Mentions légales' })).toBeVisible();
});
