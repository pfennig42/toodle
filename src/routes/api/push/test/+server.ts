import { json } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { sendPush } from '#lib/server/push.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import type { RequestHandler } from './$types';

/** "Does it work?" – sends a test message to all of the user's devices. */
const perUser = createRateLimiter(5, 15 * 60 * 1000);

export const POST: RequestHandler = async ({ locals }) => {
	if (!perUser.take(locals.user!.id)) return json({ error: 'rate' }, { status: 429 });
	const delivered = await sendPush(locals.user!.id, {
		title: m.push_test_title(),
		body: m.push_test_body(),
		url: '/profile',
		tag: 'test'
	});
	return json({ delivered });
};
