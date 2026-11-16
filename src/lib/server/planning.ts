/**
 * Organizer planning (docs/konzept.md 4.6): who is there on which day, overnight stays and
 * summaries of choice fields. Pure functions – no database access.
 */
import { utcToZoned, zonedToUtc } from '../datetime.js';
import type { FieldConfig, FieldType } from '../forms.js';
import type { AnswerValue, TravelMode } from '../registration.js';
import { straightLine, type Point, type TravelTime } from './ride-matching.js';

export type PlanningLeg = {
	mode: TravelMode;
	time: Date | null;
	lat: number | null;
	lon: number | null;
	pickups: { time: Date | null }[];
};

export type PlanningPerson = {
	registrationId: string;
	name: string;
	answers: Record<string, AnswerValue>;
	legs: { to?: PlanningLeg; from?: PlanningLeg };
};

export type PlanningField = {
	id: string;
	type: FieldType;
	label: string;
	config: FieldConfig;
};

export type Stay = {
	arrive: Date;
	leave: Date;
	/** true when the time was taken from the event because the person gave none */
	arriveAssumed: boolean;
	leaveAssumed: boolean;
};

/**
 * When is someone on site? Arrival: earliest pick-up time (public transport) or departure
 * time plus estimated drive; departure: the given departure time. Missing values fall back to
 * the event's start/end – most people simply come for the whole event.
 */
export function stayOf(
	person: Pick<PlanningPerson, 'legs'>,
	ev: { startsAt: Date; endsAt: Date; point: Point | null },
	travel: TravelTime = straightLine
): Stay {
	let arrive: Date | null = null;
	const to = person.legs.to;
	if (to) {
		const pickupTimes = to.pickups
			.map((p) => p.time?.getTime())
			.filter((t): t is number => t !== undefined);
		if (pickupTimes.length) {
			arrive = new Date(Math.min(...pickupTimes));
		} else if (to.time) {
			const minutes =
				ev.point && to.lat !== null && to.lon !== null
					? travel({ lat: to.lat, lon: to.lon }, ev.point)
					: 0;
			arrive = new Date(to.time.getTime() + Math.round(minutes) * 60000);
		}
	}
	const leave = person.legs.from?.time ?? null;
	return {
		arrive: arrive ?? ev.startsAt,
		leave: leave ?? ev.endsAt,
		arriveAssumed: !arrive,
		leaveAssumed: !leave
	};
}

/** Local calendar dates ("2027-07-16") from start to end, inclusive, in `tz`. */
export function eventDays(start: Date, end: Date, tz: string): string[] {
	const first = utcToZoned(start, tz).slice(0, 10);
	const last = utcToZoned(end < start ? start : end, tz).slice(0, 10);
	const days: string[] = [];
	for (let d = first; d <= last && days.length < 60; d = nextDay(d)) days.push(d);
	return days;
}

export function nextDay(day: string): string {
	const [y, m, d] = day.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Option counts per choice field (single/multi choice, checkbox) and sums of number fields. */
export type FieldSummary =
	| { fieldId: string; label: string; kind: 'options'; counts: { option: string; n: number }[] }
	| { fieldId: string; label: string; kind: 'number'; sum: number; answered: number };

export function summarizeFields(fields: PlanningField[], people: PlanningPerson[]): FieldSummary[] {
	const out: FieldSummary[] = [];
	for (const f of fields) {
		const values = people.map((p) => p.answers[f.id]).filter((v) => v !== undefined);
		if (f.type === 'single_choice' || f.type === 'multi_choice') {
			const options = f.config.options ?? [];
			// answers to options that were removed later still count, listed at the end
			const extra = [
				...new Set(values.flatMap((v) => (Array.isArray(v) ? v : [String(v)])))
			].filter((o) => !options.includes(o));
			out.push({
				fieldId: f.id,
				label: f.label,
				kind: 'options',
				counts: [...options, ...extra].map((option) => ({
					option,
					n: values.filter((v) => (Array.isArray(v) ? v.includes(option) : v === option)).length
				}))
			});
		} else if (f.type === 'checkbox') {
			out.push({
				fieldId: f.id,
				label: f.label,
				kind: 'options',
				counts: [{ option: '✓', n: values.filter((v) => v === true).length }]
			});
		} else if (f.type === 'number') {
			const nums = values.filter((v): v is number => typeof v === 'number');
			out.push({
				fieldId: f.id,
				label: f.label,
				kind: 'number',
				sum: nums.reduce((a, b) => a + b, 0),
				answered: nums.length
			});
		}
	}
	return out;
}

export type DayPlan = {
	day: string;
	present: number;
	/** stays overnight into the next day */
	overnight: number;
	arriving: { name: string; time: Date | null }[];
	leaving: { name: string; time: Date | null }[];
	fields: FieldSummary[];
};

/**
 * Per event day: who is there at some point, who arrives/leaves that day and who stays
 * overnight. Arrivals before the first day count on the first day (likewise for departures).
 */
export function dayPlans(
	people: PlanningPerson[],
	fields: PlanningField[],
	ev: { startsAt: Date; endsAt: Date; timezone: string; point: Point | null },
	travel: TravelTime = straightLine
): DayPlan[] {
	const days = eventDays(ev.startsAt, ev.endsAt, ev.timezone);
	const stays = people.map((p) => ({ person: p, stay: stayOf(p, ev, travel) }));
	const dayStart = (day: string) => zonedToUtc(`${day}T00:00`, ev.timezone)!;
	const localDay = (d: Date) => utcToZoned(d, ev.timezone).slice(0, 10);
	const clamp = (day: string) =>
		day < days[0] ? days[0] : day > days[days.length - 1] ? days[days.length - 1] : day;

	return days.map((day) => {
		const start = dayStart(day);
		const end = dayStart(nextDay(day));
		const present = stays.filter(
			({ stay }) =>
				// also present when arrival and departure are the same instant on this day
				(stay.arrive < end && stay.leave > start) || clamp(localDay(stay.arrive)) === day
		);
		const byTime = (a: { time: Date | null }, b: { time: Date | null }) =>
			(a.time?.getTime() ?? Infinity) - (b.time?.getTime() ?? Infinity);
		return {
			day,
			present: present.length,
			overnight: stays.filter(({ stay }) => stay.arrive < end && stay.leave > end).length,
			arriving: stays
				.filter(({ stay }) => clamp(localDay(stay.arrive)) === day)
				.map(({ person, stay }) => ({
					name: person.name,
					time: stay.arriveAssumed ? null : stay.arrive
				}))
				.sort(byTime),
			leaving: stays
				.filter(({ stay }) => clamp(localDay(stay.leave)) === day)
				.map(({ person, stay }) => ({
					name: person.name,
					time: stay.leaveAssumed ? null : stay.leave
				}))
				.sort(byTime),
			fields: summarizeFields(
				fields,
				present.map((s) => s.person)
			)
		};
	});
}

/** How people travel, per direction – for the mobility summary. */
export function modeCounts(people: PlanningPerson[], direction: 'to' | 'from') {
	const counts: Record<TravelMode | 'none', number> = {
		car: 0,
		transit: 0,
		seeking: 0,
		undecided: 0,
		none: 0
	};
	for (const p of people) counts[p.legs[direction]?.mode ?? 'none']++;
	// "not specified" and "no travel details at all" mean the same to the organizers
	counts.undecided += counts.none;
	counts.none = 0;
	return counts;
}
