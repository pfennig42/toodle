import { error } from '@sveltejs/kit';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import { fromOwnPage, getTile, parseTile, TileBusyError } from '#lib/server/tiles.js';
import type { RequestHandler } from './$types';

// A map view needs ~20 tiles, panning and zooming a few dozen more.
const perMinute = createRateLimiter(300, 60 * 1000);
const perHour = createRateLimiter(2000, 60 * 60 * 1000);

export const GET: RequestHandler = async ({ params, request, url, getClientAddress }) => {
	const tile = parseTile(params.z, params.x, params.y.replace(/\.png$/, ''));
	if (!tile) error(404, 'No such tile');
	// for the maps on toodle's own pages – not a tile server for other sites and scripts
	if (!fromOwnPage(request.headers, url.origin)) error(403, 'Tiles for toodle pages only');
	const ip = getClientAddress();
	if (!perMinute.take(ip) || !perHour.take(ip)) error(429, 'Too many requests');
	try {
		const { body, type } = await getTile(tile);
		return new Response(body as BodyInit, {
			headers: { 'content-type': type, 'cache-control': 'private, max-age=604800' }
		});
	} catch (err) {
		if (err instanceof TileBusyError) error(503, 'Map busy, try again later');
		console.error('[tiles]', err);
		error(502, 'Tile server unavailable');
	}
};
