import { expect, test, type Browser } from '@playwright/test';
import { createEvent, loginAs, ready, registerDirect } from './helpers';

const KOELN = { area: 'Köln-Ehrenfeld', lat: 50.94, lon: 6.96 };
const TALHAUSEN = { area: 'Talhausen', lat: 50.6, lon: 8.6 };
const WALDHEIM_BF = { label: 'Waldheim Bahnhof', area: 'Waldheim', lat: 50.91, lon: 8.05 };
const TALHAUSEN_BF = { label: 'Talhausen Bf', area: 'Talhausen', lat: 50.6, lon: 8.6 };

async function world(browser: Browser) {
	const users: Record<
		string,
		Awaited<ReturnType<typeof loginAs>> & { ctx: Awaited<ReturnType<Browser['newContext']>> }
	> = {};
	for (const name of ['Olga Orga', 'Anna', 'Ben', 'Lea', 'Tim', 'Udo', 'Fremde Frieda']) {
		const ctx = await browser.newContext({ locale: 'de-DE' });
		users[name] = { ...(await loginAs(ctx, name)), ctx };
	}
	const slug = createEvent(users['Olga Orga'].userId, {
		title: 'Sommerlager',
		fields: [
			{
				type: 'travel',
				label: 'Anreise & Abreise',
				required: true,
				config: { directions: ['to', 'from'] }
			}
		]
	});
	registerDirect(
		slug,
		users.Anna.userId,
		{ to: { mode: 'car', ...KOELN }, from: { mode: 'car', ...KOELN } },
		{ kind: 'whatsapp', value: '+491701234567' }
	);
	registerDirect(slug, users.Ben.userId, { to: { mode: 'car', ...TALHAUSEN, carStatus: 'full' } });
	registerDirect(
		slug,
		users.Lea.userId,
		{ to: { mode: 'seeking', ...KOELN } },
		{ kind: 'telegram', value: '@lea_s' }
	);
	registerDirect(slug, users.Tim.userId, {
		to: { mode: 'transit', pickups: [TALHAUSEN_BF, WALDHEIM_BF] }
	});
	registerDirect(slug, users.Udo.userId, { to: { mode: 'undecided' } });
	return { slug, users };
}

test('participants find and connect rides; organizers assign them', async ({
	browser
}, testInfo) => {
	const { slug, users } = await world(browser);
	const open = async (name: string, path = `/e/${slug}/rides`) => {
		const page = await users[name].ctx.newPage();
		await page.setViewportSize(
			testInfo.project.name === 'mobile'
				? { width: 360, height: 740 }
				: { width: 1280, height: 800 }
		);
		await page.goto(path);
		await ready(page);
		return page;
	};

	// Lea (looking for a ride from Köln) sees Anna first – right on her way
	const lea = await open('Lea');
	const drivers = lea.locator('section', {
		has: lea.getByRole('heading', { name: 'Wer mit dem Auto fährt' })
	});
	const cards = drivers.locator('li.ride');
	await expect(cards.first()).toContainText('Anna');
	await expect(cards.first()).toContainText('liegt auf dem Weg');
	await expect(cards.first().getByRole('link', { name: /^WhatsApp/ })).toHaveAttribute(
		'href',
		'https://wa.me/491701234567'
	);
	// Ben's car is full → shown, but no "ride with" button
	const ben = cards.filter({ hasText: 'Ben' });
	await expect(ben).toContainText('Kein Platz frei');
	await expect(ben.getByRole('button')).toHaveCount(0);
	// Privacy: no addresses anywhere
	await expect(lea.locator('body')).not.toContainText('Geheimstraße');
	await lea.screenshot({ path: testInfo.outputPath('01-seeker.png'), fullPage: true });
	await cards.first().getByRole('button', { name: 'Ich fahre bei Anna mit' }).click();
	await expect(lea.getByText('Du fährst bei Anna mit')).toBeVisible();

	// Anna (driver) sees who is looking – Tim's best alternative is Waldheim (on her way)
	const anna = await open('Anna');
	await expect(anna.getByText('Fahren bei dir mit')).toBeVisible();
	const seekers = anna
		.locator('section', { has: anna.getByRole('heading', { name: 'Wer eine Mitfahrt sucht' }) })
		.locator('li.ride');
	await expect(seekers.first()).toContainText('Tim');
	await expect(seekers.first()).toContainText('über Waldheim Bahnhof');
	await expect(seekers.filter({ hasText: 'Lea' })).toContainText('Fährt bei Anna mit');
	await seekers.first().getByRole('button', { name: 'Ich nehme Tim mit' }).click();
	await expect(anna.locator('.highlight').getByText('Tim')).toBeVisible();
	// One tap: car is full now
	await anna.getByRole('button', { name: 'Kein Platz frei' }).click();
	await expect(anna.getByRole('button', { name: 'Kein Platz frei' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await anna.screenshot({ path: testInfo.outputPath('02-driver.png'), fullPage: true });

	// Tim sees his ride and removes it again
	const tim = await open('Tim');
	await expect(tim.getByText('Du fährst bei Anna mit')).toBeVisible();
	await expect(
		tim.getByText('Sprecht Treffpunkt und Uhrzeit direkt miteinander ab:')
	).toBeVisible();
	await tim.screenshot({ path: testInfo.outputPath('03-passenger.png'), fullPage: true });
	await tim.locator('.highlight').getByRole('button', { name: 'Doch nicht mitfahren' }).click();
	await expect(tim.getByText('Du fährst bei Anna mit')).toHaveCount(0);

	// Organizer: Tim is open again → assign him manually
	const olga = await open('Olga Orga', '/');
	await olga.getByRole('link', { name: /Sommerlager/ }).click();
	await olga
		.getByRole('navigation', { name: 'Bereiche der Veranstaltung' })
		.getByRole('link', { name: 'Mitfahrten' })
		.click();
	const openSeekers = olga
		.locator('.card', { has: olga.getByRole('heading', { name: /Noch ohne Mitfahrt/ }) })
		.first();
	await expect(openSeekers).toContainText('Tim');
	const select = openSeekers.getByRole('combobox', { name: 'Fahrt für Tim wählen' });
	const annaValue = await select.locator('option', { hasText: 'Anna' }).getAttribute('value');
	await select.selectOption(annaValue!);
	await openSeekers.getByRole('button', { name: 'Zuordnen' }).click();
	const driversCard = olga
		.locator('.card', { has: olga.getByRole('heading', { name: 'Wer mit dem Auto fährt' }) })
		.first();
	await expect(driversCard.locator('li', { hasText: 'Anna' })).toContainText('Tim');
	await expect(olga.getByText(/Ohne Angabe: .*Udo/).first()).toBeVisible();
	await olga.screenshot({ path: testInfo.outputPath('03-orga.png'), fullPage: true });

	// Not registered → no access to the ride view
	const frieda = await open('Fremde Frieda');
	await expect(
		frieda.getByText('Die Mitfahr-Ansicht sehen nur angemeldete Teilnehmende.')
	).toBeVisible();

	// Anna switches to "not specified" → her passengers are free again
	const annaEdit = await open('Anna', `/e/${slug}`);
	await annaEdit.getByRole('button', { name: 'Anmeldung bearbeiten' }).click();
	await annaEdit
		.getByRole('group', { name: 'Anreise', exact: true })
		.getByRole('radio', { name: /Keine Angabe/ })
		.click();
	await annaEdit.getByRole('button', { name: 'Änderungen speichern' }).click();
	await expect(annaEdit.getByText('Deine Anmeldung wurde aktualisiert.')).toBeVisible();
	await lea.reload();
	await ready(lea);
	await expect(lea.getByText('Du fährst bei Anna mit')).toHaveCount(0);

	for (const u of Object.values(users)) await u.ctx.close();
});
