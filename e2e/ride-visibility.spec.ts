import { expect, test, type Browser } from '@playwright/test';
import { createEvent, eventIdOf, loginAs, ready, registerDirect } from './helpers';

const KOELN = { area: 'Köln-Ehrenfeld', lat: 50.94, lon: 6.96 };
const TALHAUSEN = { area: 'Talhausen', lat: 50.6, lon: 8.6 };

async function world(browser: Browser, rideVisibility: 'public' | 'matched' | 'internal') {
	const users: Record<
		string,
		Awaited<ReturnType<typeof loginAs>> & { ctx: Awaited<ReturnType<Browser['newContext']>> }
	> = {};
	for (const name of ['Olga Orga', 'Anna', 'Ben', 'Lea', 'Udo']) {
		const ctx = await browser.newContext({ locale: 'de-DE' });
		users[name] = { ...(await loginAs(ctx, name)), ctx };
	}
	const slug = createEvent(users['Olga Orga'].userId, {
		title: 'Großes Treffen',
		rideVisibility,
		fields: [{ type: 'travel', label: 'Anreise', required: true, config: { directions: ['to'] } }]
	});
	// Anna drives from Köln (Lea's way), Ben from Talhausen (not Lea's way)
	registerDirect(slug, users.Anna.userId, { to: { mode: 'car', ...KOELN } });
	registerDirect(slug, users.Ben.userId, { to: { mode: 'car', ...TALHAUSEN } });
	registerDirect(slug, users.Lea.userId, { to: { mode: 'seeking', ...KOELN } });
	registerDirect(slug, users.Udo.userId, { to: { mode: 'undecided' } });
	const open = async (name: string, path = `/e/${slug}/rides`) => {
		const page = await users[name].ctx.newPage();
		await page.goto(path);
		await ready(page);
		return page;
	};
	const close = async () => {
		for (const u of Object.values(users)) await u.ctx.close();
	};
	return { slug, users, open, close };
}

const driverCards = (page: import('@playwright/test').Page) =>
	page
		.locator('section', { has: page.getByRole('heading', { name: 'Wer mit dem Auto fährt' }) })
		.locator('li.ride');

test('matched: participants only see rides that fit their own', async ({ browser }) => {
	const { open, close } = await world(browser, 'matched');

	const lea = await open('Lea');
	await expect(lea.getByText('siehst du nur Fahrten, die zu deiner passen')).toBeVisible();
	await expect(driverCards(lea).filter({ hasText: 'Anna' })).toBeVisible();
	await expect(lea.locator('body')).not.toContainText('Ben');
	await expect(lea.getByText(/weitere Einträge sind ausgeblendet/)).toBeVisible();
	await driverCards(lea).getByRole('button', { name: 'Ich fahre bei Anna mit' }).click();
	await expect(lea.getByText('Du fährst bei Anna mit')).toBeVisible();

	// Anna sees Lea (her passenger), but not the other driver
	const anna = await open('Anna');
	await expect(anna.locator('.highlight').getByText('Lea')).toBeVisible();
	await expect(anna.locator('body')).not.toContainText('Ben');

	// Ben's way doesn't pass anyone
	const ben = await open('Ben');
	await expect(ben.getByText('Gerade sucht niemand auf deiner Strecke')).toBeVisible();
	await expect(ben.locator('body')).not.toContainText('Lea');

	// Without an own trip there's nothing to match
	const udo = await open('Udo');
	await expect(udo.getByText('Trag ein, wie du anreist')).toBeVisible();
	await expect(udo.locator('body')).not.toContainText('Anna');

	// The organizers still see everything
	const olga = await open('Olga Orga');
	await expect(olga.getByText('Als Orga siehst du alle Fahrten')).toBeVisible();
	await expect(driverCards(olga).filter({ hasText: 'Ben' })).toBeVisible();

	await close();
});

test('internal: only the organizers see rides and match people', async ({ browser }) => {
	const { slug, open, close } = await world(browser, 'internal');

	const lea = await open('Lea');
	await expect(lea.getByText('sieht nur das Orga-Team die Fahrten')).toBeVisible();
	await expect(lea.locator('body')).not.toContainText('Anna');

	// The registration form says so, too
	const leaEvent = await open('Lea', `/e/${slug}`);
	await leaEvent.getByRole('button', { name: 'Anmeldung bearbeiten' }).click();
	await expect(leaEvent.getByText('Deine Fahrt sieht nur das Orga-Team.')).toBeVisible();

	// Olga assigns Lea to Anna → Lea sees Anna (with contact), nobody else
	const olga = await open('Olga Orga', `/events/${eventIdOf(slug)}/rides`);
	const openSeekers = olga
		.locator('.card', { has: olga.getByRole('heading', { name: /Noch ohne Mitfahrt/ }) })
		.first();
	const select = openSeekers.getByRole('combobox', { name: 'Fahrt für Lea wählen' });
	const annaValue = await select.locator('option', { hasText: 'Anna' }).getAttribute('value');
	await select.selectOption(annaValue!);
	await openSeekers.getByRole('button', { name: 'Zuordnen' }).click();
	const driversCard = olga
		.locator('.card', { has: olga.getByRole('heading', { name: 'Wer mit dem Auto fährt' }) })
		.first();
	await expect(driversCard.locator('li', { hasText: 'Anna' })).toContainText('Lea');

	await lea.reload();
	await ready(lea);
	await expect(lea.getByText('Du fährst bei Anna mit')).toBeVisible();
	await expect(lea.locator('body')).not.toContainText('Ben');

	await close();
});

test('organizers get a hint for big events and confirm widening', async ({ browser }) => {
	const { slug, open, close } = await world(browser, 'matched');
	const olga = await open('Olga Orga', `/events/${eventIdOf(slug)}/details`);
	const group = olga.getByRole('group', { name: 'Wer sieht die Fahrten?' });
	await expect(group.getByRole('radio', { name: /Halböffentlich/ })).toBeChecked();

	// Widening after people registered needs a yes
	await group
		.getByRole('radio', { name: /Öffentlich/ })
		.first()
		.check();
	const confirm = olga.getByRole('checkbox', { name: /Trotzdem ändern/ });
	await expect(confirm).toBeVisible();

	// Many people → suggestion to switch back
	await olga.getByLabel(/Max. Teilnehmende/).fill('150');
	await olga.getByRole('button', { name: 'Auf halböffentlich stellen' }).click();
	await expect(group.getByRole('radio', { name: /Halböffentlich/ })).toBeChecked();
	await expect(confirm).toHaveCount(0);

	await group.getByRole('radio', { name: /Intern/ }).check();
	await olga.getByRole('button', { name: 'Speichern' }).click();
	await expect(olga.getByText('Gespeichert')).toBeVisible();

	const lea = await open('Lea');
	await expect(lea.getByText('sieht nur das Orga-Team die Fahrten')).toBeVisible();

	await close();
});
