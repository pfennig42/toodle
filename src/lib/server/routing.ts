/**
 * Optional real driving times via an OSRM server (ROUTING_URL), e.g. a self-hosted
 * `osrm-backend` with the Germany extract. Without it – or when it fails – the straight-line
 * estimate is used, so the app never depends on the routing server.
 *
 * One "table" request per event covers all relevant points (homes, stations, venue);
 * results are cached briefly because the ride view is opened often.
 */
import { ROUTING_URL } from '$app/env/private';
import { straightLine, type Participant, type Point, type TravelTime } from './ride-matching.js';

/** OSRM's default --max-table-size is 100. */
const MAX_POINTS = 100;
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 4000;

const key = (p: Point) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`;

const cache = new Map<string, { at: number; matrix: Map<string, number> }>();
/** After a failure, don't make every page wait for a dead server. */
let downUntil = 0;

/** Turns a duration table into a TravelTime, falling back to the estimate for unknown pairs. */
export function tableTravelTime(matrix: Map<string, number>): TravelTime {
	return (a, b) => {
		if (key(a) === key(b)) return 0;
		return matrix.get(`${key(a)}|${key(b)}`) ?? straightLine(a, b);
	};
}

/** Parses an OSRM /table response into "from|to" → minutes. */
export function parseTable(points: string[], body: unknown): Map<string, number> | null {
	const r = body as { code?: string; durations?: (number | null)[][] };
	if (r?.code !== 'Ok' || !Array.isArray(r.durations)) return null;
	const matrix = new Map<string, number>();
	r.durations.forEach((row, i) =>
		row?.forEach((seconds, j) => {
			if (typeof seconds === 'number' && points[i] && points[j]) {
				matrix.set(`${points[i]}|${points[j]}`, seconds / 60);
			}
		})
	);
	return matrix;
}

export async function travelTimeFor(
	points: Point[],
	{ baseUrl = ROUTING_URL, fetcher = fetch }: { baseUrl?: string; fetcher?: typeof fetch } = {}
): Promise<TravelTime> {
	if (!baseUrl) return straightLine;
	const unique = [...new Set(points.map(key))].sort();
	if (unique.length < 2 || unique.length > MAX_POINTS) return straightLine;

	if (Date.now() < downUntil) return straightLine;
	const cacheKey = unique.join(';');
	const hit = cache.get(cacheKey);
	if (hit && Date.now() - hit.at < TTL_MS) return tableTravelTime(hit.matrix);

	try {
		const url = `${baseUrl.replace(/\/+$/, '')}/table/v1/driving/${unique.join(';')}?annotations=duration`;
		const res = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
		const matrix = res.ok ? parseTable(unique, await res.json()) : null;
		if (!matrix) throw new Error(`routing: HTTP ${res.status}`);
		if (cache.size > 200) cache.clear();
		cache.set(cacheKey, { at: Date.now(), matrix });
		return tableTravelTime(matrix);
	} catch (err) {
		downUntil = Date.now() + 60_000;
		console.warn('[routing] falling back to straight-line estimate:', (err as Error).message);
		return straightLine;
	}
}

/** All points the ride matching of an event looks at. */
export function ridePoints(participants: Participant[], eventPoint: Point | null): Point[] {
	const pts: Point[] = eventPoint ? [eventPoint] : [];
	for (const p of participants) {
		for (const leg of Object.values(p.legs)) {
			if (!leg) continue;
			if (leg.lat !== null && leg.lon !== null) pts.push({ lat: leg.lat, lon: leg.lon });
			for (const s of leg.pickups) pts.push({ lat: s.lat, lon: s.lon });
		}
	}
	return pts;
}

/** Convenience: travel times for an event's ride data. */
export const rideTravelTime = (participants: Participant[], eventPoint: Point | null) =>
	eventPoint ? travelTimeFor(ridePoints(participants, eventPoint)) : Promise.resolve(straightLine);
