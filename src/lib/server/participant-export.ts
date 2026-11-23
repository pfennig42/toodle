/** Builds the participant CSV (one row per registration, travel spread over several columns). */
import { m } from '../paraglide/messages.js';
import { utcToZoned } from '../datetime.js';
import type { TravelDirection } from '../forms.js';
import type { AnswerValue } from '../registration.js';
import { carStatusLabel, modeLabel } from '../travel-summary.js';
import type { OrgaParticipant } from './participants.js';

type Field = {
	id: string;
	type: string;
	label: string;
	config: { directions?: TravelDirection[] };
};

export function participantRows(
	fields: Field[],
	people: OrgaParticipant[],
	timezone: string
): string[][] {
	const time = (d: Date | null) => (d ? utcToZoned(d, timezone).replace('T', ' ') : '');
	const answerText = (v: AnswerValue | undefined) =>
		v === undefined
			? ''
			: v === true
				? m.yes()
				: v === false
					? m.no()
					: Array.isArray(v)
						? v.join(', ')
						: String(v);
	const dirLabel = (d: TravelDirection) => (d === 'to' ? m.travel_to() : m.travel_from());

	const header: string[] = [
		m.csv_name(),
		m.csv_email(),
		m.csv_contacts(),
		m.csv_status(),
		m.csv_registered_at()
	];
	for (const f of fields) {
		if (f.type === 'travel') {
			for (const d of f.config.directions ?? []) {
				const p = dirLabel(d);
				header.push(
					`${p}: ${m.csv_mode()}`,
					`${p}: ${m.csv_place()}`,
					`${p}: ${m.csv_time()}`,
					`${p}: ${m.csv_car()}`,
					`${p}: ${m.csv_pickups()}`,
					`${p}: ${m.csv_ride()}`
				);
			}
		} else {
			header.push(f.label);
		}
	}
	header.push(m.registration_comment());

	const rows = people.map((p) => {
		const row: string[] = [
			p.name,
			p.email,
			p.contacts
				.map((c) => `${c.kind === 'other' && c.label ? c.label : c.kind}: ${c.value}`)
				.join(', '),
			p.status === 'active'
				? m.csv_status_active()
				: p.status === 'waitlisted'
					? m.csv_status_waitlisted({ position: p.waitlistPosition ?? 0 })
					: m.csv_status_withdrawn(),
			time(p.createdAt)
		];
		for (const f of fields) {
			if (f.type === 'travel') {
				for (const d of f.config.directions ?? []) {
					const leg = p.legs.find((l) => l.direction === d);
					if (!leg) {
						row.push('', '', '', '', '', '');
						continue;
					}
					row.push(
						modeLabel(leg.mode),
						[
							leg.placeLabel,
							leg.placeArea && leg.placeArea !== leg.placeLabel ? `(${leg.placeArea})` : ''
						]
							.filter(Boolean)
							.join(' '),
						leg.hasClock ? time(leg.time) : time(leg.time).slice(0, 10),
						leg.carStatus
							? carStatusLabel(leg.carStatus) + (leg.carNote ? ` – ${leg.carNote}` : '')
							: '',
						leg.pickups
							.map((x) => (x.time ? `${x.label} ${time(x.time).slice(11)}` : x.label))
							.join(' / '),
						leg.ridesWith ?? leg.passengers.join(', ')
					);
				}
			} else {
				row.push(answerText(p.answers[f.id]));
			}
		}
		row.push(p.comment);
		return row;
	});

	return [header, ...rows];
}
