import { describe, expect, it } from 'vitest';
import { parseAnswers, parseTravel } from './registration-rules';

const fd = (entries: [string, string][]) => {
	const f = new FormData();
	for (const [k, v] of entries) f.append(k, v);
	return f;
};

describe('parseAnswers', () => {
	const fields = [
		{ id: 'a', type: 'short_text' as const, required: true, config: {} },
		{
			id: 'b',
			type: 'single_choice' as const,
			required: false,
			config: { options: ['Veggie', 'Vegan'] }
		},
		{
			id: 'c',
			type: 'multi_choice' as const,
			required: false,
			config: { options: ['Fr', 'Sa', 'So'] }
		},
		{ id: 'd', type: 'checkbox' as const, required: false, config: {} },
		{ id: 'e', type: 'number' as const, required: false, config: {} },
		{ id: 't', type: 'travel' as const, required: true, config: {} }
	];

	it('collects valid answers and keeps option order', () => {
		const r = parseAnswers(
			fields,
			fd([
				['field_a', ' Anna '],
				['field_b', 'Vegan'],
				['field_c', 'So'],
				['field_c', 'Fr'],
				['field_d', 'on'],
				['field_e', '2,5']
			])
		);
		expect(r.ok && Object.fromEntries(r.answers)).toEqual({
			a: 'Anna',
			b: 'Vegan',
			c: ['Fr', 'So'],
			d: true,
			e: 2.5
		});
	});

	it('reports required and invalid answers', () => {
		const r = parseAnswers(
			fields,
			fd([
				['field_b', 'Fleisch'],
				['field_e', 'viele']
			])
		);
		expect(r).toEqual({ ok: false, errors: { a: 'required', b: 'invalid', e: 'invalid' } });
	});
});

describe('parseTravel', () => {
	const home = {
		id: 'p1',
		label: 'Zuhause',
		address: 'Venloer Str. 12, Köln',
		area: 'Köln-Ehrenfeld',
		lat: 50.94,
		lon: 6.94
	};
	const opts = {
		directions: ['to', 'from'] as ('to' | 'from')[],
		required: true,
		timezone: 'Europe/Berlin',
		savedPlaces: [home]
	};
	const station = (name: string, lat: number) => ({
		name,
		address: `${name}, Bahnhofstr. 1`,
		area: name.split(' ')[0],
		lat,
		lon: 8.1,
		shareName: true
	});

	it('resolves saved places and accepts several pick-up alternatives', () => {
		const r = parseTravel(
			{
				to: {
					mode: 'transit',
					time: '',
					place: { kind: 'saved', id: 'p1' },
					pickups: [
						{ point: station('Waldheim Bahnhof', 50.9), time: '2027-07-16T16:40' },
						{ point: station('Talhausen Bf', 50.95), time: '' }
					]
				},
				from: {
					mode: 'car',
					time: '2027-07-18T14:00',
					place: { kind: 'saved', id: 'p1' },
					carStatus: 'full',
					carNote: '  Umweg ok ',
					pickups: [{ point: station('Ignored', 1), time: '' }]
				}
			},
			opts
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		const [to, from] = r.legs;
		expect(to.place?.area).toBe('Köln-Ehrenfeld');
		expect(to.pickups.map((p) => p.label)).toEqual(['Waldheim Bahnhof', 'Talhausen Bf']);
		expect(to.pickups[0].time?.toISOString()).toBe('2027-07-16T14:40:00.000Z');
		expect(to.pickups[1].time).toBeNull();
		expect(to.carStatus).toBeNull();
		expect(from).toMatchObject({
			mode: 'car',
			carStatus: 'full',
			carNote: 'Umweg ok',
			pickups: []
		});
	});

	it('never shows a street address as pick-up – only the area', () => {
		const address = {
			name: 'Venloer Straße 12',
			address: 'Venloer Straße 12, 50672 Köln',
			area: 'Köln-Neustadt-Nord',
			lat: 50.94,
			lon: 6.93
		};
		const r = parseTravel(
			{
				to: {
					mode: 'seeking',
					pickups: [
						{ point: address, time: '' },
						// a client claiming "shareable" with anything but `true` doesn't count
						{ point: { ...address, shareName: 'yes' }, time: '' },
						{ point: null, savedId: 'p1', time: '' },
						{ point: station('Waldheim Bahnhof', 50.9), time: '' }
					]
				},
				from: { mode: 'car', place: { kind: 'custom', label: '', point: address } }
			},
			opts
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		const [to, from] = r.legs;
		expect(to.pickups.map((p) => p.label)).toEqual([
			'Köln-Neustadt-Nord',
			'Köln-Neustadt-Nord',
			'Zuhause',
			'Waldheim Bahnhof'
		]);
		expect(from.place?.label).toBe('Köln-Neustadt-Nord');
		expect(from.place?.address).toBe('Venloer Straße 12, 50672 Köln');
	});

	it('requires a mode for required travel fields', () => {
		expect(parseTravel({ to: { mode: null } }, opts)).toEqual({
			ok: false,
			errors: { to: 'required', from: 'required' }
		});
		expect(parseTravel({}, { ...opts, required: false })).toEqual({
			ok: true,
			legs: [],
			placesToSave: []
		});
	});

	it('needs a start place for drivers and ride seekers', () => {
		const r = parseTravel({ to: { mode: 'car', place: null }, from: { mode: 'undecided' } }, opts);
		expect(r).toEqual({ ok: false, errors: { to: 'place' } });
	});

	it('flexible: needs a start place and always offers seats', () => {
		expect(
			parseTravel({ to: { mode: 'flexible', place: null }, from: { mode: 'undecided' } }, opts)
		).toEqual({ ok: false, errors: { to: 'place' } });
		const r = parseTravel(
			{
				to: {
					mode: 'flexible',
					place: { kind: 'saved', id: home.id },
					carStatus: 'full',
					carNote: 'Kombi'
				},
				from: { mode: 'undecided' }
			},
			opts
		);
		expect(r.ok && r.legs[0]).toMatchObject({
			mode: 'flexible',
			carStatus: 'offering',
			carNote: 'Kombi'
		});
	});

	it('rejects places of other users and incomplete pick-ups', () => {
		const r = parseTravel(
			{
				to: { mode: 'seeking', place: { kind: 'saved', id: 'someone-else' } },
				from: { mode: 'transit', pickups: [{ point: null, time: '' }] }
			},
			opts
		);
		expect(r).toEqual({ ok: false, errors: { to: 'place', from: 'pickup' } });
	});

	it('returns custom places to be saved', () => {
		const r = parseTravel(
			{
				to: {
					mode: 'seeking',
					place: {
						kind: 'custom',
						label: 'Oma',
						save: true,
						point: {
							name: 'Hauptstr. 3',
							address: 'Hauptstr. 3, Bonn',
							area: 'Bonn',
							lat: 50.7,
							lon: 7.1
						}
					}
				},
				from: { mode: 'undecided' }
			},
			opts
		);
		expect(r.ok && r.placesToSave).toEqual([
			{ label: 'Oma', address: 'Hauptstr. 3, Bonn', area: 'Bonn', lat: 50.7, lon: 7.1 }
		]);
	});
});
