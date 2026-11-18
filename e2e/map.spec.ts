import { expect, test } from '@playwright/test';
import { addPlace, createEvent, loginAs, mockGeocoder, ready } from './helpers';

// 1×1 transparent PNG – no requests to the real tile server
const TILE = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

test('the folded map shows the event and the chosen places; a click adds one', async ({
	page,
	context,
	browser
}, testInfo) => {
	const owner = await (async () => {
		const ctx = await browser.newContext();
		const u = await loginAs(ctx, 'Orga Olga');
		await ctx.close();
		return u;
	})();
	const slug = createEvent(owner.userId, {
		title: 'Kartenlager',
		fields: [{ type: 'travel', label: 'Anreise', required: true, config: { directions: ['to'] } }]
	});
	const lea = await loginAs(context, 'Lea S.');
	addPlace(lea.userId, 'Zuhause', 'Waldheim-Nord', 50.95, 8.12);

	await page.route('**/api/tiles/**', (route) =>
		route.fulfill({ body: TILE, contentType: 'image/png' })
	);
	await mockGeocoder(page);
	let reverse = '';
	await page.route('**/api/geocode?lat=**', (route) => {
		reverse = route.request().url();
		return route.fulfill({
			json: [
				{
					name: 'Lindenplatz',
					address: 'Lindenplatz, 57000 Waldheim',
					area: 'Waldheim',
					lat: 50.91,
					lon: 8.09
				}
			]
		});
	});

	await page.goto(`/e/${slug}`);
	await ready(page);
	const leg = page.getByRole('group', { name: 'Anreise', exact: true });
	await leg.getByRole('radio', { name: /Suche Mitfahrt/ }).click();

	// folded by default
	const toggle = leg.getByText('Auf der Karte zeigen');
	await expect(toggle).toBeVisible();
	await expect(leg.locator('.leaflet-container')).toHaveCount(0);

	await toggle.click();
	const map = leg.locator('.leaflet-container');
	await expect(map).toBeVisible();
	// the event (★) and the saved place "Zuhause" (1)
	await expect(map.locator('.toodle-pin.event')).toHaveCount(1);
	await expect(map.locator('.toodle-pin.spot')).toHaveCount(1);
	await expect(leg.getByText('Jugendhof Waldheim')).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('map-open.png'), fullPage: true });

	// a click on the map looks up the address there and adds it as another place
	const box = (await map.boundingBox())!;
	await map.click({ position: { x: box.width * 0.3, y: box.height * 0.6 } });
	await expect(leg.getByText('Lindenplatz')).toBeVisible();
	await expect(map.locator('.toodle-pin.spot')).toHaveCount(2);
	expect(reverse).toMatch(/lat=[\d.]+&lon=[\d.]+/);
	await page.screenshot({ path: testInfo.outputPath('map-picked.png'), fullPage: true });

	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText('✓ Du bist dabei!')).toBeVisible();
	await expect(page.locator('#registration').getByText(/Lindenplatz/)).toBeVisible();
});
