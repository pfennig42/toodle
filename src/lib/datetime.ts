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

/** Human readable date range, e.g. "Fr., 16. Juli 2027, 18:00 – So., 18. Juli, 14:00". */
export function formatRange(start: Date, end: Date, tz: string, locale: string): string {
	const sameDay = utcToZoned(start, tz).slice(0, 10) === utcToZoned(end, tz).slice(0, 10);
	const full = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
	const endFmt = new Intl.DateTimeFormat(
		locale,
		sameDay
			? { timeZone: tz, hour: '2-digit', minute: '2-digit' }
			: {
					timeZone: tz,
					weekday: 'short',
					day: 'numeric',
					month: 'long',
					hour: '2-digit',
					minute: '2-digit'
				}
	);
	return `${full.format(start)} – ${endFmt.format(end)}`;
}

export function formatDateTime(date: Date, tz: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

/** Time zones offered in the event form – Europe first (toodle's focus), current value always included. */
export function timeZoneOptions(current: string): string[] {
	const all =
		typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
	const europe = all.filter((tz) => tz.startsWith('Europe/'));
	return [...new Set([DEFAULT_TIMEZONE, current, ...europe, 'UTC'])];
}
