import { expect, test } from '@playwright/test';
import { createEvent, loginAs, ready } from './helpers';

const FIELDS = [
	{
		type: 'travel',
		label: 'Anreise & Abreise',
		required: true,
		config: { directions: ['to', 'from'] }
	}
];

test('an event opened but not registered for stays reachable – from the profile and the start page', async ({
	page,
	context,
	browser
}) => {
	const ctx = await browser.newContext();
	const owner = await loginAs(ctx, 'Orga Olga');
	await ctx.close();
	const slug = createEvent(owner.userId, { title: 'Pfingstlager', fields: FIELDS });
	const other = createEvent(owner.userId, { title: 'Waldtag', fields: FIELDS });
	await loginAs(context, 'Mia');

	// a detour to the profile while registering: the way back is offered
	await page.goto(`/e/${slug}`);
	await ready(page);
	await page.locator('#registration').getByRole('link', { name: 'Ändern' }).click();
	await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
	await page.getByRole('link', { name: '← Zurück zu Pfingstlager' }).click();
	await expect(page.getByRole('heading', { name: 'Pfingstlager', level: 1 })).toBeVisible();

	// the start page lists both events as not finished yet
	await page.goto(`/e/${other}`);
	await page.goto('/');
	const unfinished = page.locator('section', {
		has: page.getByRole('heading', { name: 'Anmeldung noch abschließen' })
	});
	await expect(unfinished.getByRole('link', { name: /Pfingstlager/ })).toBeVisible();
	await expect(unfinished.getByRole('link', { name: /Waldtag/ })).toBeVisible();

	// not interested in one: hidden
	await unfinished.getByRole('button', { name: '„Waldtag“ ausblenden' }).click();
	await expect(unfinished.getByRole('link', { name: /Waldtag/ })).toHaveCount(0);

	// finishing the other one moves it to "Du bist dabei"
	await unfinished.getByRole('link', { name: /Pfingstlager/ }).click();
	await ready(page);
	await page
		.getByRole('group', { name: 'Anreise', exact: true })
		.getByRole('radio', { name: /Keine Angabe/ })
		.click();
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Anmeldung noch abschließen' })).toHaveCount(0);
	const going = page.locator('section', {
		has: page.getByRole('heading', { name: 'Du bist dabei' })
	});
	await expect(going.getByRole('link', { name: /Pfingstlager/ })).toBeVisible();

	// looking at a hidden event again brings it back
	await page.goto(`/e/${other}`);
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Waldtag/ })).toBeVisible();
});
