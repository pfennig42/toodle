import { describe, expect, it } from 'vitest';
import { detourMinutes, straightLine, type TravelTime } from './ride-matching.js';

const HOME = { lat: 50.94, lon: 6.96 };
const STATION = { lat: 50.91, lon: 8.05 };
const EVENT = { lat: 50.9, lon: 8.1 };
const k = (p: { lat: number; lon: number }) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`;

import * as routing from './routing.js';

const BASE = 'http://osrm.test/';

/** Fake OSRM: durations in seconds, 60 min between every pair except home→station (90 min). */
function fakeOsrm(calls: string[], fail = false): typeof fetch {
	return (async (input: string | URL | Request) => {
		const url = String(input);
		calls.push(url);
		if (fail) return new Response('nope', { status: 502 });
		const coords = url.split('/driving/')[1].split('?')[0].split(';');
		const durations = coords.map((a) =>
			coords.map((b) => (a === b ? 0 : a === k(HOME) && b === k(STATION) ? 5400 : 3600))
		);
		return Response.json({ code: 'Ok', durations });
	}) as typeof fetch;
}

describe('routing', () => {
	it('parses OSRM tables and falls back for unknown pairs', () => {
		const m = routing.parseTable(['a', 'b'], {
			code: 'Ok',
			durations: [
				[0, 120],
				[null, 0]
			]
		})!;
		expect(m.get('a|b')).toBe(2);
		expect(m.has('b|a')).toBe(false);
		expect(routing.parseTable(['a'], { code: 'InvalidQuery' })).toBeNull();

		const t = routing.tableTravelTime(new Map([[`${k(HOME)}|${k(EVENT)}`, 77]]));
		expect(t(HOME, EVENT)).toBe(77);
		expect(t(EVENT, HOME)).toBeCloseTo(straightLine(EVENT, HOME));
		expect(t(HOME, HOME)).toBe(0);
	});

	it('asks the server once per point set and uses real durations', async () => {
		const calls: string[] = [];
		const travel: TravelTime = await routing.travelTimeFor([HOME, STATION, EVENT, HOME], {
			baseUrl: BASE,
			fetcher: fakeOsrm(calls)
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatch(
			/^http:\/\/osrm\.test\/table\/v1\/driving\/[\d.,;]+\?annotations=duration$/
		);
		expect(travel(HOME, STATION)).toBe(90);
		// detour = 90 + 60 − 60
		expect(detourMinutes(HOME, STATION, EVENT, travel)).toBe(90);

		await routing.travelTimeFor([EVENT, STATION, HOME], {
			baseUrl: BASE,
			fetcher: fakeOsrm(calls)
		});
		expect(calls).toHaveLength(1); // cached
	});

	it('falls back to the estimate when the server fails, and backs off', async () => {
		const calls: string[] = [];
		const other = { lat: 51, lon: 7 };
		const travel = await routing.travelTimeFor([other, EVENT], {
			baseUrl: BASE,
			fetcher: fakeOsrm(calls, true)
		});
		expect(travel).toBe(straightLine);
		await routing.travelTimeFor([other, HOME], { baseUrl: BASE, fetcher: fakeOsrm(calls, true) });
		expect(calls).toHaveLength(1);
	});
});

describe('push endpoints', () => {
	it('only accepts the push services of common browsers', async () => {
		const { isAllowedEndpoint } = await import('./push.js');
		expect(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
		expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
		expect(isAllowedEndpoint('https://web.push.apple.com/QAbc')).toBe(true);
		expect(isAllowedEndpoint('http://fcm.googleapis.com/x')).toBe(false);
		expect(isAllowedEndpoint('https://127.0.0.1/x')).toBe(false);
		expect(isAllowedEndpoint('https://evil.example/googleapis.com')).toBe(false);
		expect(isAllowedEndpoint('https://googleapis.com.evil.example/x')).toBe(false);
		expect(isAllowedEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
		expect(isAllowedEndpoint('not a url')).toBe(false);
	});
});
