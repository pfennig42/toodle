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
	startDate: '2027-07-16',
	startTime: '18:00',
	endDate: '2027-07-18',
	endTime: '14:00',
	timezone: 'Europe/Berlin',
	contactEmail: 'Orga@Example.org '
};

describe('parseEventDetails', () => {
	it('parses a minimal event', () => {
		const r = parseEventDetails(formData(base));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.details.startsAt.toISOString()).toBe('2027-07-16T16:00:00.000Z');
		expect(r.details).toMatchObject({ startHasTime: true, endHasTime: true });
		expect(r.details.lat).toBeNull();
		expect(r.details.capacity).toBeNull();
		expect(r.details.rideVisibility).toBe('public');
		expect(r.details.contactEmail).toBe('orga@example.org');
	});

	it('requires a valid contact email', () => {
		for (const contactEmail of ['', 'orga', 'orga@example', 'a b@example.org']) {
			const r = parseEventDetails(formData({ ...base, contactEmail }));
			expect(r).toEqual({ ok: false, errors: ['contact_email'] });
		}
	});

	it('takes a valid ride visibility and ignores anything else', () => {
		const ok = parseEventDetails(formData({ ...base, rideVisibility: 'internal' }));
		expect(ok.ok && ok.details.rideVisibility).toBe('internal');
		const bad = parseEventDetails(formData({ ...base, rideVisibility: 'everyone' }));
		expect(bad.ok && bad.details.rideVisibility).toBe('public');
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

	it('treats missing times as whole days', () => {
		const r = parseEventDetails(
			formData({
				title: 'Zeltlager',
				startDate: '2027-07-16',
				endDate: '2027-07-18',
				deadlineDate: '2027-07-01',
				timezone: 'Europe/Berlin',
				contactEmail: 'orga@example.org'
			})
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		// local midnight / 23:59 in summer time (UTC+2)
		expect(r.details.startsAt.toISOString()).toBe('2027-07-15T22:00:00.000Z');
		expect(r.details.endsAt.toISOString()).toBe('2027-07-18T21:59:00.000Z');
		expect(r.details.registrationDeadline!.toISOString()).toBe('2027-07-01T21:59:00.000Z');
		expect(r.details).toMatchObject({
			startHasTime: false,
			endHasTime: false,
			deadlineHasTime: false
		});

		// a one-day event without times is fine
		const oneDay = parseEventDetails(
			formData({
				...base,
				startTime: '',
				endTime: '',
				title: 'Ausflug',
				startDate: '2027-05-01',
				endDate: '2027-05-01'
			})
		);
		expect(oneDay.ok).toBe(true);
		// mixed: start with time, end without
		const mixed = parseEventDetails(formData({ ...base, endTime: '' }));
		expect(mixed.ok && mixed.details).toMatchObject({ startHasTime: true, endHasTime: false });
	});

	it('requires the address when creating', () => {
		expect(parseEventDetails(formData(base), { requireLocation: true })).toEqual({
			ok: false,
			errors: ['location']
		});
		const withAddress = parseEventDetails(
			formData({ ...base, address: 'Am Wald 3', area: 'Waldheim', lat: '50.9', lon: '8.1' }),
			{ requireLocation: true }
		);
		expect(withAddress.ok).toBe(true);
	});

	it('rejects malformed dates and times', () => {
		const r = parseEventDetails(formData({ ...base, startTime: '25h', endDate: '18.07.2027' }));
		expect(r).toEqual({ ok: false, errors: ['start', 'end'] });
	});

	it('collects all errors', () => {
		const r = parseEventDetails(
			formData({
				title: '',
				startDate: '2027-07-18',
				endDate: '2027-07-16',
				deadlineDate: '2027-08-01',
				capacity: '0'
			})
		);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.errors).toEqual([
			'title',
			'end_before_start',
			'deadline',
			'capacity',
			'contact_email'
		]);
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
			contactEmail: 'orga@example.org',
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
		expect(publishBlockers(ev({ contactEmail: null, endsAt: new Date(Date.now() + 1e9) }))).toEqual(
			['contact']
		);
	});
});
