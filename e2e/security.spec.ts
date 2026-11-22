import { expect, test, type Page } from '@playwright/test';
import { createEvent, loginAs, mockGeocoder, ready } from './helpers';

// 1×1 transparent PNG – no requests to the real tile server
const TILE = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

/** Collects everything the browser blocked because of the Content Security Policy. */
function cspViolations(page: Page) {
	const found: string[] = [];
	page.on('console', (msg) => {
		if (/content.security.policy/i.test(msg.text())) found.push(msg.text());
	});
	return found;
}

test('pages are sent with security headers', async ({ request }) => {
	const res = await request.get('/');
	const h = res.headers();
	expect(h['content-security-policy']).toContain("script-src 'self' 'nonce-");
	expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(h['x-frame-options']).toBe('DENY');
	expect(h['x-content-type-options']).toBe('nosniff');
	expect(h['referrer-policy']).toBe('same-origin');
	expect(h['permissions-policy']).toContain('camera=()');
});

test('the strict policy blocks nothing the app needs (registration with map)', async ({
	page,
	context,
	browser
}) => {
	const violations = cspViolations(page);
	const orga = await browser.newContext();
	const owner = await loginAs(orga, 'Orga Olga');
	await orga.close();
	const slug = createEvent(owner.userId, {
		title: 'Sicheres Lager',
		fields: [{ type: 'travel', label: 'Anreise', required: true, config: { directions: ['to'] } }]
	});
	await page.route('**/api/tiles/**', (route) =>
		route.fulfill({ body: TILE, contentType: 'image/png' })
	);
	await loginAs(context, 'Lea S.');
	await mockGeocoder(page);

	await page.goto('/');
	await ready(page);
	await page.goto(`/e/${slug}`);
	await ready(page);
	const leg = page.getByRole('group', { name: 'Anreise', exact: true });
	await leg.getByRole('radio', { name: /Gemeinsam fahren/ }).click();
	await leg.getByRole('radio', { name: /Suche Mitfahrt/ }).click();
	await leg.getByText('Auf der Karte zeigen').click();
	await expect(leg.locator('.leaflet-container .toodle-pin.event')).toHaveCount(1);

	expect(violations).toEqual([]);
});
