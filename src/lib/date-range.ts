/**
 * Calendar maths for the date range picker. Dates are plain "YYYY-MM-DD" strings (no time zone
 * involved – the event's zone is applied on the server). Weeks start on Monday (ISO, Europe).
 */

export type DateRange = { start: string; end: string };
/** Which end of the range the next click sets */
export type RangePhase = 'start' | 'end';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
	return ISO.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
}

function toDate(iso: string): Date {
	return new Date(iso + 'T00:00:00Z');
}

function toIso(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
	const d = toDate(iso);
	d.setUTCDate(d.getUTCDate() + days);
	return toIso(d);
}

/** Same day of month in another month, clamped (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
	const d = toDate(iso);
	const day = d.getUTCDate();
	d.setUTCDate(1);
	d.setUTCMonth(d.getUTCMonth() + months);
	const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
	d.setUTCDate(Math.min(day, last));
	return toIso(d);
}

/** "2026-11-18" → "2026-11" */
export function monthOf(iso: string): string {
	return iso.slice(0, 7);
}

/**
 * The days of a month as weeks (Monday first); days outside the month are null.
 * `month` is "YYYY-MM".
 */
export function monthGrid(month: string): (string | null)[][] {
	const first = toDate(month + '-01');
	const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
	const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
	const cells: (string | null)[] = Array(offset).fill(null);
	for (let i = 0; i < days; i++) cells.push(addDays(month + '-01', i));
	while (cells.length % 7) cells.push(null);
	const weeks: (string | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

/**
 * Hotel-style picking: the first click sets the start (and a one-day range), the second the
 * end. A second click before the start begins again from there.
 */
export function pickDate(
	range: DateRange,
	phase: RangePhase,
	date: string
): { range: DateRange; phase: RangePhase; done: boolean } {
	if (phase === 'end' && range.start && date >= range.start) {
		return { range: { start: range.start, end: date }, phase: 'start', done: true };
	}
	return { range: { start: date, end: date }, phase: 'end', done: false };
}

/** Whether `date` lies inside the range – `preview` stands in for the end while still picking. */
export function inRange(date: string, range: DateRange, preview?: string): boolean {
	const end = preview && preview >= range.start ? preview : range.end;
	return !!range.start && !!end && date >= range.start && date <= end;
}

/** Short weekday names, Monday first. */
export function weekdayNames(locale: string): string[] {
	const f = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
	return Array.from({ length: 7 }, (_, i) => f.format(toDate(addDays('2024-01-01', i)))); // a Monday
}

export function formatMonth(month: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(toDate(month + '-01'));
}

/** Full date for screen readers, e.g. "Freitag, 27. November 2026" */
export function formatLongDate(iso: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(
		toDate(iso)
	);
}

/** "Fr., 27. – So., 29. November 2026" or a single day */
export function formatDateRange(range: DateRange, locale: string): string {
	const f = new Intl.DateTimeFormat(locale, {
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
	const start = toDate(range.start);
	if (!range.end || range.end === range.start) return f.format(start);
	return f.formatRange(start, toDate(range.end));
}

/** "Fr., 27. Nov." – a day in a sentence, where the year is obvious */
export function formatShortDate(iso: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	}).format(new Date(iso.slice(0, 10) + 'T00:00:00Z'));
}
