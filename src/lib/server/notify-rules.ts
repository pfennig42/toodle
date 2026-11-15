/**
 * When to mail whom (docs/konzept.md 4.7) – pure functions, no database, no mail.
 *
 * - Seekers hear about drivers whose way passes by (detour ≤ GOOD_DETOUR_MIN, time fits).
 * - Drivers hear about seekers on their route.
 * - Everybody hears about each other person at most once (tracked by the caller).
 */
import type { TravelDirection } from '../forms.js';
import type { TravelMode } from '../registration.js';
import {
	bestMatch,
	GOOD_DETOUR_MIN,
	isDriver,
	isSeeker,
	searchPoints,
	timeFits,
	type Link,
	type Participant,
	type Point,
	type TravelTime,
	straightLine
} from './ride-matching.js';

export type MatchNotice = {
	/** recipient */
	userId: string;
	registrationId: string;
	direction: TravelDirection;
	role: 'seeker' | 'driver';
	other: {
		registrationId: string;
		name: string;
		/** area of the driver's home, or the station/area of the seeker */
		place: string | null;
		detourMin: number;
	};
};

/** Stable key so the same pair is only announced once per direction. */
export const matchRef = (n: Pick<MatchNotice, 'direction' | 'other'>) =>
	`${n.direction}:${n.other.registrationId}`;

/** All good matches right now, from both perspectives. */
export function rideMatchNotices(
	participants: Participant[],
	links: Link[],
	eventPoint: Point,
	directions: TravelDirection[],
	travel: TravelTime = straightLine
): MatchNotice[] {
	const out: MatchNotice[] = [];
	for (const direction of directions) {
		const taken = new Set(
			links.filter((l) => l.direction === direction).map((l) => l.passengerRegistrationId)
		);
		const drivers = participants.filter(
			(p) => isDriver(p.legs[direction]) && p.legs[direction]!.carStatus === 'offering'
		);
		const seekers = participants.filter(
			(p) => isSeeker(p.legs[direction]) && !taken.has(p.registrationId)
		);
		for (const s of seekers) {
			const points = searchPoints(s.legs[direction]);
			for (const d of drivers) {
				if (d.userId === s.userId) continue;
				const match = bestMatch(d.legs[direction]!, points, eventPoint, direction, travel);
				if (!match || match.detourMin > GOOD_DETOUR_MIN || !timeFits(match)) continue;
				out.push({
					userId: s.userId,
					registrationId: s.registrationId,
					direction,
					role: 'seeker',
					other: {
						registrationId: d.registrationId,
						name: d.name,
						place: d.legs[direction]!.placeArea,
						detourMin: match.detourMin
					}
				});
				out.push({
					userId: d.userId,
					registrationId: d.registrationId,
					direction,
					role: 'driver',
					other: {
						registrationId: s.registrationId,
						name: s.name,
						place: match.via.label || null,
						detourMin: match.detourMin
					}
				});
			}
		}
	}
	return out;
}

/** Directions that still lie ahead – nobody needs ride offers for a trip in the past. */
export function openDirections(
	directions: TravelDirection[],
	ev: { startsAt: Date; endsAt: Date },
	now: Date
): TravelDirection[] {
	return directions.filter((d) => (d === 'to' ? now < ev.startsAt : now < ev.endsAt));
}

export const MATCH_MAIL_GAP_MS = 3 * 60 * 60 * 1000;

/** Group pending notices per recipient and event; respects a minimum gap between mails. */
export function groupNotices(
	notices: MatchNotice[],
	known: Set<string>,
	lastMailAt: Map<string, Date>,
	now: Date
): Map<string, MatchNotice[]> {
	const groups = new Map<string, MatchNotice[]>();
	for (const n of notices) {
		if (known.has(`${n.userId}|${matchRef(n)}`)) continue;
		const last = lastMailAt.get(n.userId);
		if (last && now.getTime() - last.getTime() < MATCH_MAIL_GAP_MS) continue;
		const list = groups.get(n.userId) ?? [];
		list.push(n);
		groups.set(n.userId, list);
	}
	for (const list of groups.values()) list.sort((a, b) => a.other.detourMin - b.other.detourMin);
	return groups;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Reminder for open travel plans: 7 days before the start, or 2 days before the registration
 * deadline if that comes earlier. Not for registrations younger than a day.
 */
export function travelReminderDue(
	ev: { startsAt: Date; registrationDeadline: Date | null },
	reg: { updatedAt: Date; legs: Partial<Record<TravelDirection, { mode: TravelMode }>> },
	directions: TravelDirection[],
	now: Date
): boolean {
	if (!directions.length || now >= ev.startsAt) return false;
	let trigger = ev.startsAt.getTime() - 7 * DAY;
	if (ev.registrationDeadline && ev.registrationDeadline > now) {
		trigger = Math.min(trigger, ev.registrationDeadline.getTime() - 2 * DAY);
	}
	if (now.getTime() < trigger) return false;
	if (now.getTime() - reg.updatedAt.getTime() < DAY) return false;
	return directions.some((d) => !reg.legs[d] || reg.legs[d]!.mode === 'undecided');
}
