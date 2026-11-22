import { describe, expect, it } from 'vitest';
import { contactHref } from './contact-links';

describe('contactHref', () => {
	it('builds deep links', () => {
		expect(contactHref('phone', '+491701234567')).toBe('tel:+491701234567');
		expect(contactHref('whatsapp', '+491701234567')).toBe('https://wa.me/491701234567');
		expect(contactHref('whatsapp', '+352621123456')).toBe('https://wa.me/352621123456');
		expect(contactHref('signal', '+491701234567')).toBe('https://signal.me/#p/+491701234567');
		expect(contactHref('telegram', '@anna_m')).toBe('https://t.me/anna_m');
		expect(contactHref('email', 'a@b.de')).toBe('mailto:a@b.de');
	});

	it('opens links of other messengers, shows anything else as text', () => {
		expect(contactHref('other', 'https://matrix.to/#/@anna:example.org')).toBe(
			'https://matrix.to/#/@anna:example.org'
		);
		expect(contactHref('other', 'ABCD1234')).toBeNull();
		expect(contactHref('other', 'javascript:alert(1)')).toBeNull();
	});

	it('has no link for Signal usernames, guesses no country for national numbers', () => {
		expect(contactHref('signal', 'anna.42')).toBeNull();
		expect(contactHref('whatsapp', '01701234567')).toBeNull();
	});
});
