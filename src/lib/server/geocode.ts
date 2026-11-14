import { GEOCODER_URL } from '$app/env/private';
import { addressFromProperties, areaFromProperties } from './geocode-format.js';

export type GeocodeResult = { address: string; area: string; lat: number; lon: number };

type PhotonFeature = {
	geometry: { coordinates: [number, number] };
	properties: Record<string, string | undefined>;
};

/** Forward geocoding via a Photon-compatible API (https://photon.komoot.io by default). */
export async function geocode(query: string, lang: string): Promise<GeocodeResult[]> {
	const url = new URL('/api', GEOCODER_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '6');
	if (['de', 'en', 'fr'].includes(lang)) url.searchParams.set('lang', lang);

	const res = await fetch(url, {
		headers: { 'user-agent': 'toodle (self-hosted event & ride sharing app)' },
		signal: AbortSignal.timeout(5000)
	});
	if (!res.ok) throw new Error(`Geocoder responded with ${res.status}`);
	const data = (await res.json()) as { features?: PhotonFeature[] };

	const seen = new Set<string>();
	return (data.features ?? [])
		.map((f) => ({
			address: addressFromProperties(f.properties),
			area: areaFromProperties(f.properties),
			lon: f.geometry.coordinates[0],
			lat: f.geometry.coordinates[1]
		}))
		.filter((r) => r.address && r.area && !seen.has(r.address) && seen.add(r.address));
}
