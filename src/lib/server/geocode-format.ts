/**
 * Coarse, shareable area name – town plus district if available, never street or house number.
 * e.g. "Köln-Ehrenfeld", "Waldheim", "Bonn".
 */
export function areaFromProperties(p: Record<string, string | undefined>): string {
	const town = p.city ?? p.town ?? p.village ?? p.municipality ?? p.county ?? p.state ?? '';
	const district = p.district ?? p.suburb ?? p.locality;
	if (p.type === 'city' || p.type === 'town' || p.type === 'village') return p.name ?? town;
	if (town && district && district !== town) return `${town}-${district}`;
	return town || p.name || '';
}

export function addressFromProperties(p: Record<string, string | undefined>): string {
	const street = [p.street, p.housenumber].filter(Boolean).join(' ');
	const town = [p.postcode, p.city ?? p.town ?? p.village].filter(Boolean).join(' ');
	const head = p.name && p.name !== p.street ? p.name : undefined;
	return [head, street, town, p.country].filter(Boolean).join(', ');
}
