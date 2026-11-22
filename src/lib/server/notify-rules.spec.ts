import { describe, expect, it } from 'vitest';
import {
	groupNotices,
	MATCH_MAIL_GAP_MS,
	matchRef,
	openDirections,
	rideMatchNotices,
	travelReminderDue
} from './notify-rules.js';
import type { Participant, RideLeg } from './ride-matching.js';

const EVENT = { lat: 50.9, lon: 8.1 };

const leg = (over: Partial<RideLeg>): RideLeg => ({
	mode: 'car',
	time: null,
	placeLabel: 'Zuhause',
	placeArea: null,
	lat: null,
	lon: null,
	carStatus: null,
	carNote: '',
	hasClock: true,
	pickups: [],
	...over
});

const person = (name: string, to: RideLeg): Participant => ({
	registrationId: `r-${name}`,
	userId: `u-${name}`,
	name,
	contacts: [],
	legs: { to }
});

// Köln → event; Lea in Köln too, Tim at a station on the way, Zoe far off (Munich)
const anna = person(
	'Anna',
	leg({ placeArea: 'Köln', lat: 50.94, lon: 6.96, carStatus: 'offering' })
);
const ben = person('Ben', leg({ placeArea: 'Köln', lat: 50.94, lon: 6.97, carStatus: 'full' }));
const lea = person('Lea', leg({ mode: 'seeking', placeArea: 'Köln', lat: 50.93, lon: 6.95 }));
const tim = person(
	'Tim',
	leg({
		mode: 'transit',
		pickups: [{ label: 'Waldheim Bf', area: 'Waldheim', lat: 50.91, lon: 8.05, time: null }]
	})
);
const zoe = person('Zoe', leg({ mode: 'seeking', placeArea: 'München', lat: 48.14, lon: 11.58 }));

describe('rideMatchNotices', () => {
	const notices = rideMatchNotices([anna, ben, lea, tim, zoe], [], EVENT, ['to']);

	it('pairs seekers with offering drivers on their way, both directions of the pair', () => {
		const pairs = notices.map((n) => `${n.userId}→${n.other.name}`).sort();
		expect(pairs).toEqual(['u-Anna→Lea', 'u-Anna→Tim', 'u-Lea→Anna', 'u-Tim→Anna']);
	});

	it('announces two flexible people to each other only once', () => {
		const flex = (name: string, lon: number) =>
			person(
				name,
				leg({ mode: 'flexible', placeArea: 'Köln', lat: 50.94, lon, carStatus: 'offering' })
			);
		const pairs = rideMatchNotices([flex('Fia', 6.96), flex('Max', 6.97)], [], EVENT, ['to']).map(
			(n) => `${n.userId}→${n.other.name}`
		);
		expect(pairs.sort()).toEqual(['u-Fia→Max', 'u-Max→Fia']);
	});

	it('names the station for public transport users', () => {
		const forAnna = notices.find((n) => n.userId === 'u-Anna' && n.other.name === 'Tim')!;
		expect(forAnna).toMatchObject({ role: 'driver', other: { place: 'Waldheim Bf' } });
		const forTim = notices.find((n) => n.userId === 'u-Tim')!;
		expect(forTim).toMatchObject({ role: 'seeker', other: { place: 'Köln' } });
	});

	it('skips people who already have a ride', () => {
		const linked = rideMatchNotices(
			[anna, lea],
			[
				{
					id: 'l',
					direction: 'to',
					driverRegistrationId: 'r-Ben',
					passengerRegistrationId: 'r-Lea'
				}
			],
			EVENT,
			['to']
		);
		expect(linked).toEqual([]);
	});

	it('ignores drivers whose times clearly do not fit', () => {
		const early = person(
			'Early',
			leg({
				placeArea: 'Köln',
				lat: 50.94,
				lon: 6.96,
				carStatus: 'offering',
				time: new Date('2027-07-16T08:00:00Z')
			})
		);
		const late = person(
			'Late',
			leg({
				mode: 'seeking',
				placeArea: 'Köln',
				lat: 50.93,
				lon: 6.95,
				time: new Date('2027-07-16T15:00:00Z')
			})
		);
		expect(rideMatchNotices([early, late], [], EVENT, ['to'])).toEqual([]);
	});
});

describe('groupNotices', () => {
	const notices = rideMatchNotices([anna, lea, tim], [], EVENT, ['to']);
	const now = new Date('2027-07-01T12:00:00Z');

	it('groups per recipient and drops what was already announced', () => {
		const known = new Set([
			`u-Anna|${matchRef({ direction: 'to', other: { registrationId: 'r-Lea' } as never })}`
		]);
		const groups = groupNotices(notices, known, new Map(), now);
		expect(groups.get('u-Anna')!.map((n) => n.other.name)).toEqual(['Tim']);
		expect(groups.get('u-Lea')!.map((n) => n.other.name)).toEqual(['Anna']);
	});

	it('waits a few hours after the last hint mail', () => {
		const recent = new Map([['u-Anna', new Date(now.getTime() - MATCH_MAIL_GAP_MS / 2)]]);
		expect(groupNotices(notices, new Set(), recent, now).has('u-Anna')).toBe(false);
		const old = new Map([['u-Anna', new Date(now.getTime() - MATCH_MAIL_GAP_MS - 1)]]);
		expect(groupNotices(notices, new Set(), old, now).has('u-Anna')).toBe(true);
	});
});

describe('openDirections', () => {
	const ev = {
		startsAt: new Date('2027-07-16T16:00:00Z'),
		endsAt: new Date('2027-07-18T12:00:00Z')
	};
	it('drops the arrival once the event has started', () => {
		expect(openDirections(['to', 'from'], ev, new Date('2027-07-10T00:00:00Z'))).toEqual([
			'to',
			'from'
		]);
		expect(openDirections(['to', 'from'], ev, new Date('2027-07-17T00:00:00Z'))).toEqual(['from']);
		expect(openDirections(['to', 'from'], ev, new Date('2027-07-19T00:00:00Z'))).toEqual([]);
	});
});

describe('travelReminderDue', () => {
	const DAY = 86400000;
	const startsAt = new Date('2027-07-16T16:00:00Z');
	const old = new Date(startsAt.getTime() - 30 * DAY);
	const open = { updatedAt: old, legs: { to: { mode: 'undecided' as const } } };

	it('fires 7 days before the start for undecided or missing travel', () => {
		const ev = { startsAt, registrationDeadline: null };
		expect(travelReminderDue(ev, open, ['to'], new Date(startsAt.getTime() - 8 * DAY))).toBe(false);
		expect(travelReminderDue(ev, open, ['to'], new Date(startsAt.getTime() - 6 * DAY))).toBe(true);
		expect(
			travelReminderDue(
				ev,
				{ updatedAt: old, legs: {} },
				['to', 'from'],
				new Date(startsAt.getTime() - DAY)
			)
		).toBe(true);
		expect(
			travelReminderDue(
				ev,
				{ updatedAt: old, legs: { to: { mode: 'car' } } },
				['to'],
				new Date(startsAt.getTime() - DAY)
			)
		).toBe(false);
	});

	it('fires earlier when the registration deadline comes first', () => {
		const ev = { startsAt, registrationDeadline: new Date(startsAt.getTime() - 14 * DAY) };
		expect(travelReminderDue(ev, open, ['to'], new Date(startsAt.getTime() - 15 * DAY))).toBe(true);
	});

	it('leaves fresh registrations and past events alone', () => {
		const ev = { startsAt, registrationDeadline: null };
		const now = new Date(startsAt.getTime() - 2 * DAY);
		expect(
			travelReminderDue(ev, { ...open, updatedAt: new Date(now.getTime() - 3600000) }, ['to'], now)
		).toBe(false);
		expect(travelReminderDue(ev, open, ['to'], new Date(startsAt.getTime() + 1))).toBe(false);
		expect(travelReminderDue(ev, open, [], now)).toBe(false);
	});
});
