/**
 * Map tiles for the registration map, fetched through the app: visitors' IP addresses are not
 * passed on to the tile server (like the address search). A small in-memory cache keeps the load
 * on the tile server low – fine for a single instance.
 */
import { TILE_URL } from '$app/env/private';

export const MAX_ZOOM = 19;
const CACHE_SIZE = 2000;
const CACHE_MS = 7 * 24 * 60 * 60 * 1000;

type Tile = { body: Uint8Array; type: string; at: number };
const cache = new Map<string, Tile>();

/** z/x/y as integers within the tile grid, otherwise null. */
export function parseTile(z: string, x: string, y: string) {
	const [zi, xi, yi] = [z, x, y].map((v) => (/^\d{1,7}$/.test(v) ? Number(v) : NaN));
	if (!(zi >= 0 && zi <= MAX_ZOOM)) return null;
	const n = 2 ** zi;
	if (!(xi >= 0 && xi < n && yi >= 0 && yi < n)) return null;
	return { z: zi, x: xi, y: yi };
}

export function tileUrl(t: { z: number; x: number; y: number }, template = TILE_URL) {
	return template
		.replace('{z}', String(t.z))
		.replace('{x}', String(t.x))
		.replace('{y}', String(t.y));
}

export async function getTile(t: { z: number; x: number; y: number }, now = Date.now()) {
	const key = `${t.z}/${t.x}/${t.y}`;
	const hit = cache.get(key);
	if (hit && now - hit.at < CACHE_MS) {
		// most recently used last – the oldest go first
		cache.delete(key);
		cache.set(key, hit);
		return hit;
	}
	const res = await fetch(tileUrl(t), {
		headers: { 'user-agent': 'toodle (self-hosted event & ride sharing app)' },
		signal: AbortSignal.timeout(8000)
	});
	if (!res.ok) throw new Error(`Tile server responded with ${res.status}`);
	const tile = {
		body: new Uint8Array(await res.arrayBuffer()),
		type: res.headers.get('content-type') ?? 'image/png',
		at: now
	};
	cache.delete(key);
	cache.set(key, tile);
	while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
	return tile;
}
