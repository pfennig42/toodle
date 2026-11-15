import { describe, expect, it } from 'vitest';
import { eventIcs } from './ics.js';

describe('eventIcs', () => {
	const ics = eventIcs({
		id: 'abc',
		title: 'Sommerlager; Wald, Wiese',
		startsAt: new Date('2027-07-16T16:00:00Z'),
		endsAt: new Date('2027-07-18T12:00:00Z'),
		location: 'Jugendhof Waldheim, Am Wald 3',
		url: 'https://toodle.lu/e/abc123',
		description: ''
	});

	it('contains UTC times and escaped text', () => {
		expect(ics).toContain('DTSTART:20270716T160000Z\r\n');
		expect(ics).toContain('DTEND:20270718T120000Z\r\n');
		expect(ics).toContain('SUMMARY:Sommerlager\\; Wald\\, Wiese\r\n');
		expect(ics).toContain('URL:https://toodle.lu/e/abc123\r\n');
		expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
	});

	it('folds long lines at 75 octets, also with umlauts', () => {
		const long = eventIcs({
			id: 'x',
			title: 'Ä'.repeat(100),
			startsAt: new Date(),
			endsAt: new Date(),
			location: '',
			url: 'https://toodle.lu',
			description: ''
		});
		const enc = new TextEncoder();
		for (const l of long.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
		expect(long).toContain('\r\n Ä');
		expect(long).not.toContain('LOCATION');
	});
});
