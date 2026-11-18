import { error } from '@sveltejs/kit';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import { getTile, parseTile } from '#lib/server/tiles.js';
import type { RequestHandler } from './$types';

// A map view needs ~20 tiles, panning and zooming a few dozen more.
const perIp = createRateLimiter(600, 60 * 1000);

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	const tile = parseTile(params.z, params.x, params.y.replace(/\.png$/, ''));
	if (!tile) error(404, 'No such tile');
	if (!perIp.take(getClientAddress())) error(429, 'Too many requests');
	try {
		const { body, type } = await getTile(tile);
		return new Response(body as BodyInit, {
			headers: { 'content-type': type, 'cache-control': 'public, max-age=604800' }
		});
	} catch (err) {
		console.error('[tiles]', err);
		error(502, 'Tile server unavailable');
	}
};
