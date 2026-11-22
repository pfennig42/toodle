import { expect, test } from '@playwright/test';
import { createEvent, eventIdOf, loginAs } from './helpers';

/**
 * SvelteKit runs page loads in parallel with the layout – and skips the layout when the client
 * says it's still valid (x-sveltekit-invalidated). The organizer check in the layout alone
 * must therefore never be what keeps an event's data private.
 */
test('nobody but the organizers gets the data of the management pages', async ({
	browser,
	context
}) => {
	const olga = await loginAs(context, 'Olga Orga');
	const slug = createEvent(olga.userId, {
		title: 'Geheimes Treffen',
		fields: [{ type: 'travel', label: 'Anreise', config: { directions: ['to'] } }]
	});
	const id = eventIdOf(slug);
	const stranger = await browser.newContext();
	await loginAs(stranger, 'Neugierige Nina');

	const pages = ['', 'details', 'form', 'team', 'settings', 'participants', 'planning', 'rides'];
	for (const p of pages) {
		const path = `/events/${id}${p ? `/${p}` : ''}/__data.json`;
		for (const query of ['', '?x-sveltekit-invalidated=001', '?x-sveltekit-invalidated=01']) {
			const res = await stranger.request.get(path + query);
			const body = await res.text();
			expect(body, path + query).not.toContain(olga.email);
			expect(body, path + query).not.toContain('Geheimes Treffen');
			expect(body, path + query).toContain('"status":404');
		}
	}

	// the organizer still gets them
	const own = await context.request.get(`/events/${id}/team/__data.json`);
	expect(await own.text()).toContain(olga.email);
	await stranger.close();
});
