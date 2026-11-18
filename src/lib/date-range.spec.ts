import { describe, expect, it } from 'vitest';
import {
	addMonths,
	formatDateRange,
	formatShortDate,
	inRange,
	isIsoDate,
	monthGrid,
	pickDate,
	weekdayNames
} from './date-range';

describe('monthGrid', () => {
	it('starts weeks on Monday and pads with null', () => {
		const weeks = monthGrid('2026-11'); // 1 Nov 2026 is a Sunday
		expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
		expect(weeks.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null]);
		expect(weeks.flat().filter(Boolean)).toHaveLength(30);
	});

	it('handles leap years', () => {
		expect(monthGrid('2028-02').flat().filter(Boolean)).toHaveLength(29);
	});
});

describe('addMonths', () => {
	it('clamps to the end of shorter months', () => {
		expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
		expect(addMonths('2027-01-15', -1)).toBe('2026-12-15');
	});
});

describe('pickDate', () => {
	const empty = { start: '', end: '' };

	it('first click sets a one-day range, the second the end', () => {
		const first = pickDate(empty, 'start', '2026-11-27');
		expect(first).toEqual({
			range: { start: '2026-11-27', end: '2026-11-27' },
			phase: 'end',
			done: false
		});
		const second = pickDate(first.range, first.phase, '2026-11-29');
		expect(second).toEqual({
			range: { start: '2026-11-27', end: '2026-11-29' },
			phase: 'start',
			done: true
		});
	});

	it('the same day twice is a one-day event', () => {
		const first = pickDate(empty, 'start', '2026-11-27');
		expect(pickDate(first.range, first.phase, '2026-11-27').range).toEqual({
			start: '2026-11-27',
			end: '2026-11-27'
		});
	});

	it('a click before the start begins again', () => {
		const first = pickDate(empty, 'start', '2026-11-27');
		const again = pickDate(first.range, first.phase, '2026-11-20');
		expect(again).toEqual({
			range: { start: '2026-11-20', end: '2026-11-20' },
			phase: 'end',
			done: false
		});
	});

	it('picking on a finished range starts a new one', () => {
		const r = pickDate({ start: '2026-11-27', end: '2026-11-29' }, 'start', '2026-12-04');
		expect(r.range).toEqual({ start: '2026-12-04', end: '2026-12-04' });
	});
});

describe('inRange', () => {
	const r = { start: '2026-11-27', end: '2026-11-27' };
	it('uses the hovered day as preview end', () => {
		expect(inRange('2026-11-28', r)).toBe(false);
		expect(inRange('2026-11-28', r, '2026-11-29')).toBe(true);
		expect(inRange('2026-11-28', r, '2026-11-20')).toBe(false);
	});
});

describe('formatting', () => {
	it('shares month and year in a range', () => {
		// Intl uses thin/no-break spaces around the dash
		const plain = (s: string) => s.replace(/\s/g, ' ');
		expect(plain(formatDateRange({ start: '2026-11-27', end: '2026-11-29' }, 'de'))).toBe(
			'Fr., 27. – So., 29. November 2026'
		);
		expect(plain(formatDateRange({ start: '2026-11-27', end: '2026-11-27' }, 'de'))).toBe(
			'Fr., 27. November 2026'
		);
	});

	it('formats a short day', () => {
		expect(formatShortDate('2026-11-27', 'de').replace(/\s/g, ' ')).toBe('Fr., 27. Nov.');
		expect(formatShortDate('2026-11-27T18:00', 'en')).toContain('27');
	});

	it('names weekdays Monday first', () => {
		expect(weekdayNames('de')[0]).toBe('Mo');
	});

	it('validates ISO dates', () => {
		expect(isIsoDate('2026-11-27')).toBe(true);
		expect(isIsoDate('2026-13-01')).toBe(false);
		expect(isIsoDate('27.11.2026')).toBe(false);
	});
});
