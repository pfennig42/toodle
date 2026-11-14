import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// Typing before the JavaScript has loaded (slow mobile network) must not lose input.
test('input made before hydration survives', async ({ page, context }) => {
	await loginAs(context, 'Slow Sam');
	await page.route('**/_app/immutable/**', async (route) => {
		await new Promise((r) => setTimeout(r, 1500));
		await route.continue();
	});
	await page.goto('/events/new', { waitUntil: 'commit' });
	await page.getByLabel('Titel', { exact: true }).fill('Früh getippt');
	await page.getByLabel('Beginn', { exact: true }).fill('2030-05-01T10:00');
	await page.waitForSelector('html[data-hydrated]');
	await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Früh getippt');
	await expect(page.getByLabel('Beginn', { exact: true })).toHaveValue('2030-05-01T10:00');
});
