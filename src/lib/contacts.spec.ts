import { describe, expect, it } from 'vitest';
import { normalizeContact, normalizeContactLabel } from './contacts';

describe('normalizeContact', () => {
	it('cleans phone numbers', () => {
		expect(normalizeContact('phone', '+49 170 / 123-45 67')).toBe('+491701234567');
		expect(normalizeContact('whatsapp', '00352 621 123 456')).toBe('+352621123456');
		expect(normalizeContact('phone', 'call me')).toBeNull();
	});

	it('needs the country code – a national number could be from anywhere', () => {
		expect(normalizeContact('whatsapp', '0170 1234567')).toBeNull();
		expect(normalizeContact('phone', '621 123 456')).toBeNull();
		expect(normalizeContact('signal', '01701234567')).toBeNull();
	});

	it('accepts Signal numbers and usernames', () => {
		expect(normalizeContact('signal', '+49 170 1234567')).toBe('+491701234567');
		expect(normalizeContact('signal', 'anna.42')).toBe('anna.42');
	});

	it('normalizes Telegram handles', () => {
		expect(normalizeContact('telegram', 'anna_mueller')).toBe('@anna_mueller');
		expect(normalizeContact('telegram', 'https://t.me/anna_mueller')).toBe('@anna_mueller');
		expect(normalizeContact('telegram', '@ab')).toBeNull();
	});

	it('takes other messengers as given, with the name of the service', () => {
		expect(normalizeContact('other', '  ECHO  4 2 ')).toBe('ECHO 4 2');
		expect(normalizeContact('other', '')).toBeNull();
		expect(normalizeContact('other', 'x'.repeat(101))).toBeNull();
		expect(normalizeContactLabel(' Threema ')).toBe('Threema');
		expect(normalizeContactLabel('')).toBeNull();
		expect(normalizeContactLabel('x'.repeat(31))).toBeNull();
	});

	it('validates email', () => {
		expect(normalizeContact('email', 'Anna@Example.org')).toBe('anna@example.org');
		expect(normalizeContact('email', 'nope')).toBeNull();
	});
});
