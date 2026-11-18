import { error, json } from '@sveltejs/kit';
import { geocode, reverseGeocode } from '#lib/server/geocode.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import type { RequestHandler } from './$types';

const perUser = createRateLimiter(60, 60 * 1000);
/** Guests (registering without an account) – stricter, per address */
const perIp = createRateLimiter(30, 60 * 1000);

// Proxied through the server so the users' IP addresses are not sent to the geocoder.
// Without `q`, but with lat/lon: what is at that point (a click on the map) – one result or [].
export const GET: RequestHandler = async ({ url, locals, getClientAddress }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	const point =
		url.searchParams.has('lat') &&
		url.searchParams.has('lon') &&
		Number.isFinite(lat) &&
		Number.isFinite(lon) &&
		Math.abs(lat) <= 90 &&
		Math.abs(lon) <= 180
			? { lat, lon }
			: undefined;
	const reverse = !q && !!point;
	if (!reverse && (q.length < 3 || q.length > 200)) return json([]);
	const allowed = locals.user ? perUser.take(locals.user.id) : perIp.take(getClientAddress());
	if (!allowed) error(429, 'Too many requests');
	try {
		if (reverse) {
			const hit = await reverseGeocode(point, locals.locale);
			return json(hit ? [hit] : []);
		}
		return json(await geocode(q, locals.locale, point));
	} catch (err) {
		console.error('[geocode]', err);
		error(502, 'Geocoder unavailable');
	}
};
