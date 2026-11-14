import { describe, expect, it } from 'vitest';
import type { Event } from './db/schema';
import { parseEventDetails, publishBlockers, registrationState } from './event-rules';

function formData(values: Record<string, string>) {
	const f = new FormData();
	for (const [k, v] of Object.entries(values)) f.set(k, v);
	return f;
}

const base = {
	title: 'Sommerfreizeit',
	startsAt: '2027-07-16T18:00',
	endsAt: '2027-07-18T14:00',
	timezone: 'Europe/Berlin'
};

describe('parseEventDetails', () => {
	it('parses a minimal event', () => {
		const r = parseEventDetails(formData(base));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.details.startsAt.toISOString()).toBe('2027-07-16T16:00:00.000Z');
		expect(r.details.lat).toBeNull();
		expect(r.details.capacity).toBeNull();
	});

	it('takes the location only as a complete set', () => {
		const r = parseEventDetails(
			formData({
				...base,
				address: 'Hauptstr. 1, Waldheim',
				area: 'Waldheim',
				lat: '50.1',
				lon: '8.2'
			})
		);
		expect(r.ok && r.details.locationArea).toBe('Waldheim');
		const broken = parseEventDetails(formData({ ...base, address: 'Hauptstr. 1', lat: 'x' }));
		expect(broken).toEqual({ ok: false, errors: ['location'] });
	});

	it('collects all errors', () => {
		const r = parseEventDetails(
			formData({
				title: '',
				startsAt: '2027-07-18T18:00',
				endsAt: '2027-07-16T14:00',
				registrationDeadline: '2027-08-01T00:00',
				capacity: '0'
			})
		);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.errors).toEqual(['title', 'end_before_start', 'deadline', 'capacity']);
	});
});

describe('registrationState', () => {
	const now = new Date('2027-07-01T12:00:00Z');
	const ev = (over: Partial<Event>) =>
		({
			status: 'published',
			endsAt: new Date('2027-07-18T12:00:00Z'),
			registrationClosed: false,
			registrationDeadline: null,
			lat: 50,
			lon: 8,
			...over
		}) as Event;

	it('derives the state', () => {
		expect(registrationState(ev({}), now)).toBe('open');
		expect(registrationState(ev({ status: 'draft' }), now)).toBe('draft');
		expect(registrationState(ev({ status: 'archived' }), now)).toBe('archived');
		expect(registrationState(ev({ registrationClosed: true }), now)).toBe('closed');
		expect(
			registrationState(ev({ registrationDeadline: new Date('2027-06-30T00:00:00Z') }), now)
		).toBe('deadline');
		expect(registrationState(ev({ endsAt: new Date('2027-06-01T00:00:00Z') }), now)).toBe('past');
	});

	it('lists publish blockers', () => {
		expect(publishBlockers(ev({ endsAt: new Date(Date.now() + 1e9) }))).toEqual([]);
		expect(publishBlockers(ev({ lat: null, endsAt: new Date(Date.now() + 1e9) }))).toEqual([
			'location'
		]);
	});
});
