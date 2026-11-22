import { m } from './paraglide/messages.js';
import { formatDateTime } from './datetime.js';
import type { CarStatus, TravelMode } from './registration.js';

export const MODE_ICON: Record<TravelMode, string> = {
	car: '🚗',
	flexible: '🔄',
	transit: '🚆',
	seeking: '🙋',
	undecided: '🤷'
};

export function modeLabel(mode: TravelMode): string {
	return {
		car: m.mode_car,
		flexible: m.mode_flexible,
		transit: m.mode_transit,
		seeking: m.mode_seeking,
		undecided: m.mode_undecided
	}[mode]();
}

export function carStatusLabel(status: CarStatus): string {
	return { offering: m.car_offering, full: m.car_full, not_offering: m.car_not_offering }[status]();
}

/**
 * Short, human readable time like "Fr., 16. Juli, 14:00" – or just "Fr., 16. Juli" when only
 * the day was given (`hasClock` false: the stored time of day means nothing).
 */
export function shortTime(date: Date, tz: string, locale: string, hasClock = true): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		...(hasClock && { hour: '2-digit', minute: '2-digit' })
	}).format(date);
}

export function onlyTime(date: Date, tz: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export { formatDateTime };
