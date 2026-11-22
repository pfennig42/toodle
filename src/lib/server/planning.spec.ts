import { describe, expect, it } from 'vitest';
import { zonedToUtc } from '../datetime.js';
import {
	dayPlans,
	eventDays,
	modeCounts,
	stayOf,
	summarizeFields,
	type PlanningField,
	type PlanningPerson
} from './planning.js';

const tz = 'Europe/Berlin';
const at = (local: string) => zonedToUtc(local, tz)!;
const ev = {
	startsAt: at('2027-07-16T18:00'),
	endsAt: at('2027-07-18T14:00'),
	timezone: tz,
	point: { lat: 50.9, lon: 8.1 }
};

const leg = (over: Partial<PlanningPerson['legs']['to']> = {}) => ({
	mode: 'car' as const,
	time: null,
	hasClock: true,
	lat: null,
	lon: null,
	pickups: [],
	...over
});

const person = (name: string, legs: PlanningPerson['legs'] = {}, answers = {}): PlanningPerson => ({
	registrationId: name,
	name,
	answers,
	legs
});

describe('eventDays', () => {
	it('lists local dates inclusive', () => {
		expect(eventDays(ev.startsAt, ev.endsAt, tz)).toEqual([
			'2027-07-16',
			'2027-07-17',
			'2027-07-18'
		]);
	});

	it('handles month ends and single-day events', () => {
		expect(eventDays(at('2027-02-28T10:00'), at('2027-03-01T10:00'), tz)).toEqual([
			'2027-02-28',
			'2027-03-01'
		]);
		expect(eventDays(at('2027-05-01T10:00'), at('2027-05-01T18:00'), tz)).toEqual(['2027-05-01']);
	});

	it('uses the event time zone, not UTC', () => {
		// 00:30 in Berlin is still the previous day in UTC
		expect(eventDays(at('2027-07-16T00:30'), at('2027-07-16T23:30'), tz)).toEqual(['2027-07-16']);
	});
});

describe('stayOf', () => {
	it('falls back to the event times', () => {
		const s = stayOf(person('a'), ev);
		expect(s).toMatchObject({ arriveAssumed: true, leaveAssumed: true });
		expect(s.arrive).toEqual(ev.startsAt);
		expect(s.leave).toEqual(ev.endsAt);
	});

	it('adds the estimated drive to the departure time', () => {
		// ~11 km away → a few minutes on the road
		const s = stayOf(
			person('a', { to: leg({ time: at('2027-07-17T09:00'), lat: 51.0, lon: 8.1 }) }),
			ev
		);
		const minutes = (s.arrive.getTime() - at('2027-07-17T09:00').getTime()) / 60000;
		expect(minutes).toBeGreaterThan(10);
		expect(minutes).toBeLessThan(20);
	});

	it('uses the earliest pick-up time for public transport', () => {
		const s = stayOf(
			person('a', {
				to: leg({
					mode: 'transit',
					time: at('2027-07-16T12:00'),
					pickups: [{ time: at('2027-07-16T17:10') }, { time: at('2027-07-16T16:40') }]
				}),
				from: leg({ mode: 'transit', time: at('2027-07-17T15:00') })
			}),
			ev
		);
		expect(s.arrive).toEqual(at('2027-07-16T16:40'));
		expect(s.leave).toEqual(at('2027-07-17T15:00'));
		expect(s.leaveAssumed).toBe(false);
	});

	it('counts the day but not the time of day when only the day is given', () => {
		const s = stayOf(
			person('a', {
				to: leg({ time: at('2027-07-17T12:00'), hasClock: false, lat: 51.0, lon: 8.1 }),
				from: leg({ time: at('2027-07-18T12:00'), hasClock: false })
			}),
			ev
		);
		expect(s.arrive).toEqual(at('2027-07-17T12:00'));
		expect(s).toMatchObject({ arriveClock: false, leaveClock: false, arriveAssumed: false });
		const [, sat] = dayPlans(
			[person('a', { to: leg({ time: at('2027-07-17T12:00'), hasClock: false }) })],
			[],
			ev
		);
		expect(sat.arriving).toEqual([{ name: 'a', time: null }]);
	});
});

describe('dayPlans', () => {
	const fields: PlanningField[] = [
		{
			id: 'food',
			type: 'single_choice',
			label: 'Essen',
			config: { options: ['vegan', 'vegetarisch', 'alles'] }
		}
	];
	const people = [
		person('Anna', {}, { food: 'vegan' }), // whole event
		person(
			'Ben',
			{ to: leg({ time: at('2027-07-17T10:00') }), from: leg({ time: at('2027-07-17T22:00') }) },
			{ food: 'alles' }
		), // Saturday only, no overnight
		person('Cleo', { from: leg({ time: at('2027-07-17T16:00') }) }, { food: 'vegan' }) // leaves early
	];
	const plans = dayPlans(people, fields, ev);

	it('counts presence, arrivals, departures and overnight stays', () => {
		expect(plans.map((d) => d.present)).toEqual([2, 3, 1]);
		expect(plans.map((d) => d.overnight)).toEqual([2, 1, 0]);
		expect(plans[0].arriving.map((a) => a.name)).toEqual(['Anna', 'Cleo']);
		expect(plans[1].arriving.map((a) => a.name)).toEqual(['Ben']);
		expect(plans[1].leaving.map((a) => a.name)).toEqual(['Cleo', 'Ben']);
		expect(plans[2].leaving.map((a) => a.name)).toEqual(['Anna']);
	});

	it('marks assumed times as unknown', () => {
		expect(plans[0].arriving[0].time).toBeNull();
		expect(plans[1].leaving[0].time).toEqual(at('2027-07-17T16:00'));
	});

	it('summarizes answers of the people present that day', () => {
		const sat = plans[1].fields[0];
		expect(sat.kind === 'options' && sat.counts).toEqual([
			{ option: 'vegan', n: 2 },
			{ option: 'vegetarisch', n: 0 },
			{ option: 'alles', n: 1 }
		]);
		const sun = plans[2].fields[0];
		expect(sun.kind === 'options' && sun.counts.find((c) => c.n)).toEqual({
			option: 'vegan',
			n: 1
		});
	});

	it('counts early arrivals on the first day', () => {
		const early = person('Dora', { to: leg({ time: at('2027-07-15T09:00') }) });
		const [first] = dayPlans([early], [], ev);
		expect(first.arriving.map((a) => a.name)).toEqual(['Dora']);
		expect(first.present).toBe(1);
	});
});

describe('summarizeFields', () => {
	it('counts multi choice, checkboxes, numbers and removed options', () => {
		const fields: PlanningField[] = [
			{ id: 'm', type: 'multi_choice', label: 'Workshops', config: { options: ['A', 'B'] } },
			{ id: 'c', type: 'checkbox', label: 'Foto ok', config: {} },
			{ id: 'n', type: 'number', label: 'Kinder', config: {} },
			{ id: 't', type: 'short_text', label: 'Text', config: {} }
		];
		const out = summarizeFields(fields, [
			person('a', {}, { m: ['A', 'B'], c: true, n: 2 }),
			person('b', {}, { m: ['A', 'Z'], c: false }),
			person('c', {}, { n: 1 })
		]);
		expect(out).toEqual([
			{
				fieldId: 'm',
				label: 'Workshops',
				kind: 'options',
				counts: [
					{ option: 'A', n: 2 },
					{ option: 'B', n: 1 },
					{ option: 'Z', n: 1 }
				]
			},
			{ fieldId: 'c', label: 'Foto ok', kind: 'options', counts: [{ option: '✓', n: 1 }] },
			{ fieldId: 'n', label: 'Kinder', kind: 'number', sum: 3, answered: 2 }
		]);
	});
});

describe('modeCounts', () => {
	it('counts people without travel info as not specified', () => {
		const c = modeCounts(
			[person('a', { to: leg() }), person('b', { to: leg({ mode: 'transit' }) }), person('c')],
			'to'
		);
		expect(c).toEqual({ car: 1, flexible: 0, transit: 1, seeking: 0, undecided: 1, none: 0 });
	});
});
