import { describe, expect, it } from 'vitest';
import { addressFromProperties, areaFromProperties, hasShareableName } from './geocode-format';

describe('areaFromProperties', () => {
	it('combines city and district, never the street', () => {
		const p = { street: 'Venloer Str.', housenumber: '12', city: 'Köln', district: 'Ehrenfeld' };
		expect(areaFromProperties(p)).toBe('Köln-Ehrenfeld');
	});

	it('uses the town alone when there is no district', () => {
		expect(areaFromProperties({ street: 'Hauptstr.', village: 'Waldheim' })).toBe('Waldheim');
	});

	it('uses the name for town-level results', () => {
		expect(areaFromProperties({ type: 'city', name: 'Bonn', state: 'NRW' })).toBe('Bonn');
	});
});

describe('addressFromProperties', () => {
	it('builds a readable full address', () => {
		const p = {
			name: 'Hauptbahnhof',
			street: 'Trankgasse',
			housenumber: '11',
			postcode: '50667',
			city: 'Köln',
			country: 'Deutschland'
		};
		expect(addressFromProperties(p)).toBe('Hauptbahnhof, Trankgasse 11, 50667 Köln, Deutschland');
	});
});

describe('hasShareableName', () => {
	it('shares names of stations and towns, not addresses or streets', () => {
		expect(
			hasShareableName({ type: 'house', name: 'Luxembourg', street: 'Place de la Gare' })
		).toBe(true);
		expect(hasShareableName({ type: 'city', name: 'Bonn' })).toBe(true);
		expect(hasShareableName({ type: 'house', street: 'Venloer Str.', housenumber: '12' })).toBe(
			false
		);
		expect(hasShareableName({ type: 'street', name: 'Avenue de la Liberté' })).toBe(false);
	});
});
