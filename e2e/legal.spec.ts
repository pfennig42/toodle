import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test('imprint and privacy policy are linked in the footer, also before logging in', async ({
	page
}) => {
	await page.goto('/');
	await ready(page);
	await page.getByRole('contentinfo').getByRole('link', { name: 'Impressum' }).click();
	await expect(page.getByRole('heading', { name: 'Impressum', level: 1 })).toBeVisible();
	await expect(page.getByText('Moltkestrasse 30')).toBeVisible();
	await expect(page.getByRole('link', { name: 'info@toodle.lu' })).toHaveAttribute(
		'href',
		'mailto:info@toodle.lu'
	);

	await page.getByRole('contentinfo').getByRole('link', { name: 'Datenschutz' }).click();
	await expect(page.getByRole('heading', { name: 'Datenschutz', level: 1 })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Speicherdauer' })).toBeVisible();
	await expect(page.getByText(/Brevo/)).toBeVisible();
});

test('the legal pages follow the language', async ({ browser }) => {
	const ctx = await browser.newContext({ locale: 'en-GB' });
	const page = await ctx.newPage();
	await page.goto('/privacy');
	await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
	await expect(page.getByText(/The German version is binding/)).toBeVisible();
	await ctx.close();
});
