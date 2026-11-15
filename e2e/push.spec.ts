import { expect, test } from '@playwright/test';
import {
	createEvent,
	eventIdOf,
	loginAs,
	outbox,
	pushOutbox,
	ready,
	registerDirect
} from './helpers';

const KOELN = { area: 'Köln-Ehrenfeld', lat: 50.94, lon: 6.96 };
const subscription = (id: string) => ({
	endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
	keys: {
		p256dh:
			'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
		auth: 'tBHItJI5svbpez7KI4CCXg'
	}
});

test('devices get push instead of mail; devices can be removed', async ({
	browser,
	page,
	context
}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'server-side behaviour – once is enough');
	const olga = await loginAs(context, 'Olga Orga');
	const leaCtx = await browser.newContext({ locale: 'de-DE' });
	const lea = await loginAs(leaCtx, 'Lea');
	const anna = await loginAs(await browser.newContext(), 'Anna');

	// the public key is available, foreign endpoints are refused
	const key = await leaCtx.request.get('/api/push');
	expect((await key.json()).publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
	const evil = await leaCtx.request.post('/api/push', {
		data: { subscription: { ...subscription('x'), endpoint: 'https://127.0.0.1/x' } }
	});
	expect(evil.status()).toBe(400);
	const anon = await (
		await browser.newContext()
	).request.post('/api/push', {
		data: { subscription: subscription('anon') }
	});
	expect(anon.status()).toBe(401);

	// Lea turns on push on her phone
	const ok = await leaCtx.request.post('/api/push', {
		data: { subscription: subscription('lea-phone'), label: 'Firefox · Android' }
	});
	expect(ok.status()).toBe(200);
	const testPush = await leaCtx.request.post('/api/push/test', { data: {} });
	expect((await testPush.json()).delivered).toBe(1);
	expect(pushOutbox(lea.userId).map((p) => p.title)).toContain('toodle – Test');

	// organizer links Lea to Anna → Lea: push only, Anna (no device): mail
	const slug = createEvent(olga.userId, {
		title: 'Herbstfahrt',
		fields: [{ type: 'travel', label: 'Reise', config: { directions: ['to'] } }]
	});
	registerDirect(slug, anna.userId, { to: { mode: 'car', ...KOELN } });
	registerDirect(slug, lea.userId, { to: { mode: 'seeking', ...KOELN } });
	await page.goto(`/events/${eventIdOf(slug)}/rides`);
	await ready(page);
	await page.getByRole('button', { name: 'Zuordnen' }).click();

	await expect
		.poll(() => pushOutbox(lea.userId).map((p) => p.title))
		.toContain('Du fährst bei Anna mit – Herbstfahrt');
	const push = pushOutbox(lea.userId).find((p) => p.title.startsWith('Du fährst'))!;
	expect(push.url).toBe(`/e/${slug}/rides?dir=to`);
	expect(push.body).toContain('Eingetragen von Olga Orga.');
	await expect
		.poll(() => outbox(anna.email).map((m) => m.subject))
		.toContain('Lea fährt bei dir mit – Herbstfahrt');
	expect(outbox(lea.email).map((m) => m.subject)).not.toContain(
		'Du fährst bei Anna mit – Herbstfahrt'
	);

	// the device shows up in the profile and can be removed there
	const leaPage = await leaCtx.newPage();
	await leaPage.goto('/profile');
	await ready(leaPage);
	const devices = leaPage.getByRole('listitem').filter({ hasText: 'Firefox · Android' });
	await expect(devices).toHaveCount(1);
	await expect(leaPage.getByRole('checkbox', { name: /Zusätzlich per E-Mail/ })).not.toBeChecked();
	await devices.getByRole('button', { name: 'Entfernen' }).click();
	await expect(devices).toHaveCount(0);
	expect((await (await leaCtx.request.post('/api/push/test', { data: {} })).json()).delivered).toBe(
		0
	);
});
