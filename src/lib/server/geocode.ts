import { GEOCODER_URL } from '$app/env/private';
import {
	addressFromProperties,
	areaFromProperties,
	hasShareableName,
	nameFromProperties
} from './geocode-format.js';
import { distanceKm } from './ride-matching.js';

/** A map click keeps a place's name only this close to it – otherwise it's just somewhere nearby. */
const REVERSE_NAME_KM = 0.05;

export type GeocodeResult = {
	/** Short name, e.g. "Waldheim Bahnhof" or "Venloer Straße 12" */
	name: string;
	address: string;
	area: string;
	lat: number;
	lon: number;
	/** `name` may be shown to others (a station, a venue) – not an address (see hasShareableName) */
	shareName: boolean;
};

type PhotonFeature = {
	geometry: { coordinates: [number, number] };
	properties: Record<string, string | undefined>;
};

/** Forward geocoding via a Photon-compatible API (https://photon.komoot.io by default). */
export async function geocode(
	query: string,
	lang: string,
	near?: { lat: number; lon: number }
): Promise<GeocodeResult[]> {
	const url = new URL('/api', GEOCODER_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '6');
	if (['de', 'en', 'fr'].includes(lang)) url.searchParams.set('lang', lang);
	if (near) {
		// Prefer results close to the event (e.g. the nearest train stations)
		url.searchParams.set('lat', String(near.lat));
		url.searchParams.set('lon', String(near.lon));
	}

	return toResults(await fetchFeatures(url));
}

/** The place at a point clicked on the map (Photon's /reverse). Null if nothing is there. */
export async function reverseGeocode(
	point: { lat: number; lon: number },
	lang: string
): Promise<GeocodeResult | null> {
	const url = new URL('/reverse', GEOCODER_URL);
	url.searchParams.set('lat', String(point.lat));
	url.searchParams.set('lon', String(point.lon));
	url.searchParams.set('limit', '1');
	if (['de', 'en', 'fr'].includes(lang)) url.searchParams.set('lang', lang);
	const [hit] = toResults(await fetchFeatures(url));
	if (!hit) return null;
	// keep the clicked spot – the nearest address may be some metres away
	const near = distanceKm(hit, point) <= REVERSE_NAME_KM;
	return { ...hit, shareName: hit.shareName && near, lat: point.lat, lon: point.lon };
}

async function fetchFeatures(url: URL): Promise<PhotonFeature[]> {
	const res = await fetch(url, {
		headers: { 'user-agent': 'toodle (self-hosted event & ride sharing app)' },
		signal: AbortSignal.timeout(5000)
	});
	if (!res.ok) throw new Error(`Geocoder responded with ${res.status}`);
	const data = (await res.json()) as { features?: PhotonFeature[] };
	return data.features ?? [];
}

function toResults(features: PhotonFeature[]): GeocodeResult[] {
	const seen = new Set<string>();
	return features
		.map((f) => ({
			name: nameFromProperties(f.properties),
			address: addressFromProperties(f.properties),
			area: areaFromProperties(f.properties),
			shareName: hasShareableName(f.properties),
			lon: f.geometry.coordinates[0],
			lat: f.geometry.coordinates[1]
		}))
		.filter((r) => r.address && r.area && !seen.has(r.address) && seen.add(r.address));
}
