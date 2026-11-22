/**
 * Time zone helpers. Event times are entered as wall-clock time in the event's
 * time zone (<input type="datetime-local">) and stored as UTC instants.
 */

export const DEFAULT_TIMEZONE = 'Europe/Berlin';

export function isValidTimeZone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat('en', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

/** Offset of `tz` from UTC at the given instant, in minutes. */
function offsetMinutes(instant: Date, tz: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(instant);
	const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
	const asUtc = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	return Math.round((asUtc - instant.getTime()) / 60000);
}

/** "2027-07-16T18:30" in `tz` → Date (UTC instant). Returns null for malformed input. */
export function zonedToUtc(local: string, tz: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
	if (!m) return null;
	const [y, mo, d, h, mi] = m.slice(1).map(Number);
	const guess = Date.UTC(y, mo - 1, d, h, mi);
	if (Number.isNaN(guess)) return null;
	// Two passes handle DST transitions correctly.
	let utc = guess - offsetMinutes(new Date(guess), tz) * 60000;
	utc = guess - offsetMinutes(new Date(utc), tz) * 60000;
	return new Date(utc);
}

/** Date (UTC instant) → "2027-07-16T18:30" wall-clock time in `tz` (for datetime-local inputs). */
export function utcToZoned(date: Date, tz: string): string {
	const local = new Date(date.getTime() + offsetMinutes(date, tz) * 60000);
	return local.toISOString().slice(0, 16);
}

/** Calendar days between the local dates of `a` and `b` in `tz` (b later → positive). */
export function dayDifference(a: Date, b: Date, tz: string): number {
	const day = (d: Date) => Date.parse(utcToZoned(d, tz).slice(0, 10) + 'T00:00Z');
	return Math.round((day(b) - day(a)) / 86_400_000);
}

/** The same local time of day `days` calendar days later in `tz` (DST-safe). */
export function addLocalDays(date: Date, days: number, tz: string): Date {
	const local = utcToZoned(date, tz);
	const shifted = new Date(Date.parse(local.slice(0, 10) + 'T00:00Z') + days * 86_400_000);
	return zonedToUtc(`${shifted.toISOString().slice(0, 10)}T${local.slice(11, 16)}`, tz) ?? date;
}

/** Which parts of an event's dates carry a time of day (see event.startHasTime etc.). */
export type TimeFlags = { startHasTime?: boolean; endHasTime?: boolean };

/**
 * Human readable date range, e.g. "Fr., 16. Juli 2027, 18:00 – So., 18. Juli, 14:00" or,
 * without times, "Fr., 16. – So., 18. Juli 2027" / "Sa., 1. Mai 2027".
 */
export function formatRange(
	start: Date,
	end: Date,
	tz: string,
	locale: string,
	{ startHasTime = true, endHasTime = true }: TimeFlags = {}
): string {
	const sameDay = utcToZoned(start, tz).slice(0, 10) === utcToZoned(end, tz).slice(0, 10);
	const time = { hour: '2-digit', minute: '2-digit' } as const;
	const day = { weekday: 'short', day: 'numeric', month: 'long' } as const;

	if (!startHasTime && !endHasTime) {
		const f = new Intl.DateTimeFormat(locale, { timeZone: tz, ...day, year: 'numeric' });
		// formatRange shares month/year where possible ("16. – 18. Juli 2027")
		return sameDay ? f.format(start) : f.formatRange(start, end);
	}
	const startFmt = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		...day,
		year: 'numeric',
		...(startHasTime ? time : {})
	});
	if (sameDay) {
		return endHasTime
			? `${startFmt.format(start)} – ${new Intl.DateTimeFormat(locale, { timeZone: tz, ...time }).format(end)}`
			: startFmt.format(start);
	}
	const endFmt = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		...day,
		...(endHasTime ? time : {})
	});
	return `${startFmt.format(start)} – ${endFmt.format(end)}`;
}

export function formatDateTime(date: Date, tz: string, locale: string, withTime = true): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
	}).format(date);
}

/** "2027-07-16T18:30" → ["2027-07-16", "18:30"] */
export function splitLocal(local: string): [string, string] {
	return [local.slice(0, 10), local.slice(11, 16)];
}

/**
 * Date + optional time (wall clock in `tz`) → instant. Without a time, `fallback` is used –
 * "00:00" for starts, "23:59" for ends and deadlines.
 */
export function zonedDateTime(
	date: string,
	time: string,
	tz: string,
	fallback: '00:00' | '23:59'
): { at: Date; hasTime: boolean } | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
	const hasTime = /^\d{2}:\d{2}$/.test(time);
	if (time && !hasTime) return null;
	const at = zonedToUtc(`${date}T${hasTime ? time : fallback}`, tz);
	return at ? { at, hasTime } : null;
}

/** Time zones offered in the event form – Europe first (toodle's focus), current value always included. */
export function timeZoneOptions(current: string): string[] {
	const all =
		typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
	const europe = all.filter((tz) => tz.startsWith('Europe/'));
	return [...new Set([DEFAULT_TIMEZONE, current, ...europe, 'UTC'])];
}
