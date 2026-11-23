import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	TILE_URL: 'https://tiles.example/{z}/{x}/{y}.png',
	ORIGIN: 'https://toodle.test'
}));
const { fromOwnPage, getTile, parseTile, tileUrl, TileBusyError } = await import('./tiles.js');

describe('tiles', () => {
	it('accepts tiles inside the grid only', () => {
		expect(parseTile('3', '7', '0')).toEqual({ z: 3, x: 7, y: 0 });
		expect(parseTile('3', '8', '0')).toBeNull();
		expect(parseTile('20', '0', '0')).toBeNull();
		expect(parseTile('2', '-1', '0')).toBeNull();
		expect(parseTile('2', '1e1', '0')).toBeNull();
	});

	it('fills the URL template', () => {
		expect(tileUrl({ z: 5, x: 16, y: 10 })).toBe('https://tiles.example/5/16/10.png');
	});

	it('serves toodle pages only', () => {
		const own = 'https://toodle.lu';
		const h = (init: Record<string, string>) => new Headers(init);
		expect(fromOwnPage(h({ 'sec-fetch-site': 'same-origin' }), own)).toBe(true);
		expect(fromOwnPage(h({ 'sec-fetch-site': 'cross-site', referer: own + '/' }), own)).toBe(false);
		expect(fromOwnPage(h({ 'sec-fetch-site': 'none' }), own)).toBe(false);
		// older browsers: the referer decides
		expect(fromOwnPage(h({ referer: 'https://toodle.lu/e/abc' }), own)).toBe(true);
		expect(fromOwnPage(h({ referer: 'https://toodle.lu.evil.example/' }), own)).toBe(false);
		// scripts without either
		expect(fromOwnPage(h({}), own)).toBe(false);
	});

	it('asks the tile server at most 2000 times an hour – then old tiles, then nothing', async () => {
		const fetchMock = vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const week = 7 * 24 * 60 * 60 * 1000;
		const start = Date.now() - week - 1000;
		// a tile fetched long ago – outdated now
		await getTile({ z: 18, x: 0, y: 0 }, start);
		const now = Date.now();
		// …and 2000 new ones within the hour
		for (let i = 0; i < 2000; i++) await getTile({ z: 18, x: i, y: 1 }, now);
		expect(fetchMock).toHaveBeenCalledTimes(2001);
		// budget used up: the outdated tile is still served, a new one isn't fetched
		await expect(getTile({ z: 18, x: 0, y: 0 }, now)).resolves.toMatchObject({ at: start });
		await expect(getTile({ z: 18, x: 5, y: 5 }, now)).rejects.toBeInstanceOf(TileBusyError);
		expect(fetchMock).toHaveBeenCalledTimes(2001);
		vi.unstubAllGlobals();
	});
});
