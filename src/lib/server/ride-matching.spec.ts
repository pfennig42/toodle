import { describe, expect, it } from 'vitest';
import {
	bestMatch,
	buildDirectionView,
	canLink,
	canUnlink,
	detourMinutes,
	distanceKm,
	linkVisible,
	MATCHED_LIMIT,
	restrictView,
	searchPoints,
	staleLinks,
	type Participant,
	type RideLeg
} from './ride-matching';

// A little world on a line of latitude: Köln (west) … Waldheim (event) … far east
const EVENT = { lat: 50.9, lon: 8.1 };
const KOELN = { lat: 50.94, lon: 6.96 };
const BONN = { lat: 50.73, lon: 7.1 };
const WALDHEIM_BF = { lat: 50.91, lon: 8.05 }; // right next to the event
const TALHAUSEN_BF = { lat: 50.6, lon: 8.6 }; // off the route
const t = (iso: string) => new Date(iso);

const leg = (over: Partial<RideLeg>): RideLeg => ({
	mode: 'undecided',
	time: null,
	placeLabel: null,
	placeArea: null,
	lat: null,
	lon: null,
	carStatus: null,
	carNote: '',
	pickups: [],
	...over
});

const person = (id: string, to?: RideLeg, from?: RideLeg): Participant => ({
	registrationId: id,
	userId: `u-${id}`,
	name: id,
	contacts: [],
	legs: { ...(to && { to }), ...(from && { from }) }
});

const driverFrom = (p: { lat: number; lon: number }, over: Partial<RideLeg> = {}) =>
	leg({ mode: 'car', carStatus: 'offering', placeArea: 'X', ...p, ...over });

describe('geometry', () => {
	it('computes plausible distances and detours', () => {
		expect(distanceKm(KOELN, EVENT)).toBeGreaterThan(75);
		expect(distanceKm(KOELN, EVENT)).toBeLessThan(85);
		// a stop on the way costs (almost) nothing, a stop off the route costs a lot
		expect(detourMinutes(KOELN, WALDHEIM_BF, EVENT)).toBeLessThan(3);
		expect(detourMinutes(KOELN, TALHAUSEN_BF, EVENT)).toBeGreaterThan(40);
	});
});

describe('bestMatch', () => {
	const transit = leg({
		mode: 'transit',
		pickups: [
			{ label: 'Talhausen Bf', area: 'Talhausen', ...TALHAUSEN_BF, time: null },
			{
				label: 'Waldheim Bahnhof',
				area: 'Waldheim',
				...WALDHEIM_BF,
				time: t('2027-07-16T16:40:00Z')
			}
		]
	});

	it('picks the pick-up alternative with the smallest detour', () => {
		const m = bestMatch(driverFrom(KOELN), searchPoints(transit), EVENT, 'to');
		expect(m?.via.label).toBe('Waldheim Bahnhof');
		expect(m?.detourMin).toBeLessThan(3);
	});

	it('estimates when the driver passes the station', () => {
		// leaves Köln 15:30, ~1h20 to Waldheim → ~16:50, train arrives 16:40 → ~+10 min
		const m = bestMatch(
			driverFrom(KOELN, { time: t('2027-07-16T15:30:00Z') }),
			searchPoints(transit),
			EVENT,
			'to'
		);
		expect(m?.timeGapMin).toBeGreaterThan(0);
		expect(m?.timeGapMin).toBeLessThan(30);
	});
});

describe('buildDirectionView', () => {
	const anna = person('anna', driverFrom(KOELN, { placeArea: 'Köln' }));
	const ben = person('ben', driverFrom(BONN, { placeArea: 'Bonn', carStatus: 'full' }));
	const carl = person('carl', driverFrom(TALHAUSEN_BF, { placeArea: 'Talhausen' }));
	const lea = person('lea', leg({ mode: 'seeking', placeArea: 'Köln', ...KOELN }));
	const tim = person(
		'tim',
		leg({
			mode: 'transit',
			pickups: [{ label: 'Waldheim Bahnhof', area: 'Waldheim', ...WALDHEIM_BF, time: null }]
		})
	);
	const undecided = person('udo', leg({ mode: 'undecided', placeArea: 'Bonn', ...BONN }));
	const all = [anna, ben, carl, lea, tim, undecided];

	it('shows a seeker the drivers – offering first, then by detour', () => {
		const v = buildDirectionView(all, [], 'lea', 'to', EVENT);
		expect(v.role).toBe('seeker');
		expect(v.drivers.map((d) => d.registrationId)).toEqual(['anna', 'carl', 'ben']);
		expect(v.drivers[0].match!.detourMin).toBe(0);
	});

	it('shows a driver the seekers on the route', () => {
		const v = buildDirectionView(all, [], 'anna', 'to', EVENT);
		expect(v.role).toBe('driver');
		expect(v.seekers.map((s) => s.registrationId)).toEqual(['lea', 'tim']);
		expect(v.seekers.every((s) => s.match !== null)).toBe(true);
	});

	it('lets undecided people see drivers near them', () => {
		const v = buildDirectionView(all, [], 'udo', 'to', EVENT);
		expect(v.role).toBe('other');
		expect(v.drivers[0].registrationId).toBe('anna');
		expect(v.drivers[0].match).not.toBeNull();
	});

	it('reflects links: passengers, my driver, taken seekers last', () => {
		const links = [
			{
				id: 'l1',
				direction: 'to' as const,
				driverRegistrationId: 'anna',
				passengerRegistrationId: 'lea'
			}
		];
		const asLea = buildDirectionView(all, links, 'lea', 'to', EVENT);
		expect(asLea.myDriver?.registrationId).toBe('anna');
		expect(
			asLea.drivers.find((d) => d.registrationId === 'anna')!.passengers.map((p) => p.name)
		).toEqual(['lea']);
		const asAnna = buildDirectionView(all, links, 'anna', 'to', EVENT);
		expect(asAnna.myPassengers.map((p) => p.registrationId)).toEqual(['lea']);
		expect(asAnna.seekers.map((s) => s.registrationId)).toEqual(['tim', 'lea']);
		// the other direction is unaffected
		expect(buildDirectionView(all, links, 'lea', 'from', EVENT).myDriver).toBeNull();
	});
});

describe('permissions', () => {
	const anna = person('anna', driverFrom(KOELN));
	const ben = person('ben', driverFrom(BONN, { carStatus: 'full' }));
	const lea = person('lea', leg({ mode: 'seeking', ...KOELN }));

	it('passengers may join cars that take people', () => {
		expect(canLink({ registrationId: 'lea', isOrganizer: false }, anna, lea, 'to')).toBe(true);
		expect(canLink({ registrationId: 'lea', isOrganizer: false }, ben, lea, 'to')).toBe(false);
	});

	it('drivers and organizers may always link, others never', () => {
		expect(canLink({ registrationId: 'ben', isOrganizer: false }, ben, lea, 'to')).toBe(true);
		expect(canLink({ registrationId: null, isOrganizer: true }, ben, lea, 'to')).toBe(true);
		expect(canLink({ registrationId: 'anna', isOrganizer: false }, ben, lea, 'to')).toBe(false);
		expect(canLink({ registrationId: 'anna', isOrganizer: false }, anna, ben, 'to')).toBe(false); // ben drives himself
		expect(canLink({ registrationId: 'lea', isOrganizer: false }, anna, lea, 'from')).toBe(false); // no legs
	});

	it('unlinking: both parties and organizers', () => {
		const link = {
			id: 'l',
			direction: 'to' as const,
			driverRegistrationId: 'anna',
			passengerRegistrationId: 'lea'
		};
		expect(canUnlink({ registrationId: 'lea', isOrganizer: false }, link)).toBe(true);
		expect(canUnlink({ registrationId: 'anna', isOrganizer: false }, link)).toBe(true);
		expect(canUnlink({ registrationId: 'ben', isOrganizer: false }, link)).toBe(false);
		expect(canUnlink({ registrationId: null, isOrganizer: true }, link)).toBe(true);
	});

	it('finds links that became stale', () => {
		const links = [
			{
				id: 'ok',
				direction: 'to' as const,
				driverRegistrationId: 'anna',
				passengerRegistrationId: 'lea'
			},
			{
				id: 'gone',
				direction: 'to' as const,
				driverRegistrationId: 'lea',
				passengerRegistrationId: 'anna'
			}
		];
		expect(staleLinks([anna, lea], links).map((l) => l.id)).toEqual(['gone']);
	});
});

const MIDWAY = { lat: 50.92, lon: 7.5 };

describe('restrictView', () => {
	// seeker halfway between Köln and the event; Köln drives past, Berlin doesn't
	const seekerLeg = leg({
		mode: 'seeking',
		pickups: [{ label: 'Midway', area: 'Midway', ...MIDWAY, time: null }]
	});
	const people = [
		person('me', seekerLeg),
		person('koeln', driverFrom(KOELN)),
		person('koeln-full', driverFrom(KOELN, { carStatus: 'full' })),
		person('far', driverFrom({ lat: 52.5, lon: 13.4 })),
		person('other-seeker', seekerLeg),
		person('passenger', leg({ mode: 'seeking', ...BONN }))
	];
	const links = [
		{
			id: 'l1',
			direction: 'to' as const,
			driverRegistrationId: 'koeln',
			passengerRegistrationId: 'passenger'
		}
	];
	const view = (viewer: string) => buildDirectionView(people, links, viewer, 'to', EVENT);

	it('changes nothing for public events', () => {
		const v = restrictView(view('me'), 'public');
		expect(v.drivers).toHaveLength(3);
		expect(v.seekers).toHaveLength(2);
		expect(v.hidden).toEqual({ drivers: 0, seekers: 0 });
	});

	it('shows seekers only drivers that can take them, without their passengers', () => {
		const v = restrictView(view('me'), 'matched');
		expect(v.drivers.map((d) => d.registrationId)).toEqual(['koeln']);
		expect(v.drivers[0].passengers).toEqual([]);
		expect(v.seekers).toEqual([]);
		expect(v.hidden).toEqual({ drivers: 2, seekers: 2 });
	});

	it('shows drivers only open seekers on their way, and no other drivers', () => {
		const v = restrictView(view('koeln'), 'matched');
		// "passenger" is already with koeln (shown as own passenger), "me" fits
		expect(v.seekers.map((s) => s.registrationId).sort()).toEqual(
			['me', 'other-seeker', 'passenger'].sort()
		);
		expect(v.drivers).toEqual([]);
		const far = restrictView(view('far'), 'matched');
		expect(far.seekers).toEqual([]);
	});

	it('keeps the own driver even when the car is full', () => {
		const withLink = buildDirectionView(
			people,
			[
				{
					id: 'l2',
					direction: 'to',
					driverRegistrationId: 'koeln-full',
					passengerRegistrationId: 'me'
				}
			],
			'me',
			'to',
			EVENT
		);
		const v = restrictView(withLink, 'matched');
		expect(v.drivers.map((d) => d.registrationId)).toContain('koeln-full');
		expect(v.myDriver?.registrationId).toBe('koeln-full');
	});

	it('limits the lists', () => {
		const many = [
			person('me', seekerLeg),
			...Array.from({ length: MATCHED_LIMIT + 3 }, (_, i) => person(`d${i}`, driverFrom(KOELN)))
		];
		const v = restrictView(buildDirectionView(many, [], 'me', 'to', EVENT), 'matched');
		expect(v.drivers).toHaveLength(MATCHED_LIMIT);
		expect(v.hidden.drivers).toBe(3);
	});

	it('shows nobody else for internal events, but keeps own links', () => {
		const v = restrictView(view('passenger'), 'internal');
		expect(v.drivers).toEqual([]);
		expect(v.seekers).toEqual([]);
		expect(v.myDriver?.registrationId).toBe('koeln');
	});
});

describe('linkVisible', () => {
	const seekerLeg = leg({
		mode: 'seeking',
		pickups: [{ label: 'Midway', area: 'Midway', ...MIDWAY, time: null }]
	});
	const people = [
		person('me', seekerLeg),
		person('koeln', driverFrom(KOELN)),
		person('far', driverFrom({ lat: 52.5, lon: 13.4 }))
	];
	const me = { registrationId: 'me', isOrganizer: false };
	const v = restrictView(buildDirectionView(people, [], 'me', 'to', EVENT), 'matched');

	it('allows links only to shown matches', () => {
		expect(linkVisible(me, 'matched', v, 'koeln', 'me')).toBe(true);
		expect(linkVisible(me, 'matched', v, 'far', 'me')).toBe(false);
	});

	it('leaves internal events to the organizers', () => {
		expect(linkVisible(me, 'internal', v, 'koeln', 'me')).toBe(false);
		expect(
			linkVisible({ registrationId: null, isOrganizer: true }, 'internal', null, 'koeln', 'me')
		).toBe(true);
		expect(linkVisible(me, 'public', null, 'far', 'me')).toBe(true);
	});
});
