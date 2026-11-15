import { json } from '@sveltejs/kit';
import {
	parseSubscription,
	removeSubscription,
	saveSubscription,
	vapidKeys
} from '#lib/server/push.js';
import type { RequestHandler } from './$types';

/** Public key the browser needs to subscribe. */
export const GET: RequestHandler = () => json({ publicKey: vapidKeys().publicKey });

/** Subscribe this device. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as {
		subscription?: unknown;
		label?: unknown;
	} | null;
	const sub = parseSubscription(body?.subscription);
	if (!sub) return json({ error: 'invalid' }, { status: 400 });
	const label = typeof body?.label === 'string' ? body.label : '';
	if (!saveSubscription(locals.user!.id, sub, label))
		return json({ error: 'limit' }, { status: 400 });
	return json({ ok: true });
};

/** Unsubscribe this device. */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
	if (typeof body?.endpoint !== 'string') return json({ error: 'invalid' }, { status: 400 });
	removeSubscription(locals.user!.id, { endpoint: body.endpoint });
	return json({ ok: true });
};
