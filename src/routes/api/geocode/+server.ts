import { error, json } from '@sveltejs/kit';
import { geocode } from '#lib/server/geocode.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import type { RequestHandler } from './$types';

const perUser = createRateLimiter(60, 60 * 1000);

// Proxied through the server so the users' IP addresses are not sent to the geocoder.
export const GET: RequestHandler = async ({ url, locals }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (q.length < 3 || q.length > 200) return json([]);
	if (!perUser.take(locals.user!.id)) error(429, 'Too many requests');
	try {
		const lat = Number(url.searchParams.get('lat'));
		const lon = Number(url.searchParams.get('lon'));
		const near =
			url.searchParams.has('lat') && Number.isFinite(lat) && Number.isFinite(lon)
				? { lat, lon }
				: undefined;
		return json(await geocode(q, locals.locale, near));
	} catch (err) {
		console.error('[geocode]', err);
		error(502, 'Geocoder unavailable');
	}
};
