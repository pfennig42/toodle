/** Minimal iCalendar (RFC 5545) file for one event – attached to the confirmation mail. */

const stamp = (d: Date) =>
	d
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');

/** Escapes text values and folds lines at 75 octets. */
function line(name: string, value: string, raw = false): string {
	const escaped = raw
		? value
		: value
				.replace(/\\/g, '\\\\')
				.replace(/;/g, '\\;')
				.replace(/,/g, '\\,')
				.replace(/\r?\n/g, '\\n');
	const full = `${name}:${escaped}`;
	const out: string[] = [];
	let rest = full;
	const enc = new TextEncoder();
	while (enc.encode(rest).length > 75) {
		let cut = 75;
		while (enc.encode(rest.slice(0, cut)).length > 75) cut--;
		out.push(rest.slice(0, cut));
		rest = ' ' + rest.slice(cut);
	}
	out.push(rest);
	return out.join('\r\n');
}

export function eventIcs(ev: {
	id: string;
	title: string;
	startsAt: Date;
	endsAt: Date;
	location: string;
	url: string;
	description: string;
}): string {
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//toodle//toodle.lu//DE',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${ev.id}@toodle`,
		`DTSTAMP:${stamp(new Date())}`,
		`DTSTART:${stamp(ev.startsAt)}`,
		`DTEND:${stamp(ev.endsAt)}`,
		line('SUMMARY', ev.title),
		...(ev.location ? [line('LOCATION', ev.location)] : []),
		line('DESCRIPTION', ev.description ? `${ev.description}\n\n${ev.url}` : ev.url),
		line('URL', ev.url, true),
		'END:VEVENT',
		'END:VCALENDAR',
		''
	].join('\r\n');
}
