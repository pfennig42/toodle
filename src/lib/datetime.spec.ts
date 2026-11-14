import { describe, expect, it } from 'vitest';
import { formatRange, utcToZoned, zonedToUtc } from './datetime';

describe('zonedToUtc / utcToZoned', () => {
	it('converts summer time (CEST, UTC+2)', () => {
		expect(zonedToUtc('2027-07-16T18:00', 'Europe/Berlin')?.toISOString()).toBe(
			'2027-07-16T16:00:00.000Z'
		);
	});

	it('converts winter time (CET, UTC+1)', () => {
		expect(zonedToUtc('2027-01-15T09:30', 'Europe/Berlin')?.toISOString()).toBe(
			'2027-01-15T08:30:00.000Z'
		);
	});

	it('handles the day of the DST switch', () => {
		// 2027-03-28: clocks jump from 02:00 to 03:00 in Berlin
		expect(zonedToUtc('2027-03-28T12:00', 'Europe/Berlin')?.toISOString()).toBe(
			'2027-03-28T10:00:00.000Z'
		);
	});

	it('works for other zones', () => {
		expect(zonedToUtc('2027-07-16T18:00', 'Europe/London')?.toISOString()).toBe(
			'2027-07-16T17:00:00.000Z'
		);
	});

	it('round-trips', () => {
		const utc = zonedToUtc('2027-10-03T07:45', 'Europe/Berlin')!;
		expect(utcToZoned(utc, 'Europe/Berlin')).toBe('2027-10-03T07:45');
	});

	it('rejects malformed input', () => {
		expect(zonedToUtc('16.07.2027 18:00', 'Europe/Berlin')).toBeNull();
		expect(zonedToUtc('', 'Europe/Berlin')).toBeNull();
	});
});

describe('formatRange', () => {
	it('shows the end date only when it differs', () => {
		const tz = 'Europe/Berlin';
		const sameDay = formatRange(
			zonedToUtc('2027-07-16T10:00', tz)!,
			zonedToUtc('2027-07-16T16:00', tz)!,
			tz,
			'de'
		);
		expect(sameDay).toMatch(/16\. Juli 2027.*10:00 – 16:00$/);
		const weekend = formatRange(
			zonedToUtc('2027-07-16T18:00', tz)!,
			zonedToUtc('2027-07-18T14:00', tz)!,
			tz,
			'de'
		);
		expect(weekend).toContain('18. Juli');
	});
});
