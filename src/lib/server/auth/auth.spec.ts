import { describe, expect, it } from 'vitest';
import { DUMMY_HASH, generateToken, hashPassword, hashToken, verifyPassword } from './crypto';
import { createRateLimiter } from './rate-limit';
import { isValidPassword, normalizeEmail, safeNext } from './validation';

describe('passwords', () => {
	it('verifies the right password and rejects others', async () => {
		const hash = await hashPassword('correct horse battery');
		expect(hash.startsWith('scrypt$')).toBe(true);
		expect(await verifyPassword('correct horse battery', hash)).toBe(true);
		expect(await verifyPassword('wrong password!', hash)).toBe(false);
	});

	it('never accepts anything against the dummy hash', async () => {
		expect(await verifyPassword('', DUMMY_HASH)).toBe(false);
		expect(await verifyPassword('whatever12', DUMMY_HASH)).toBe(false);
	});

	it('rejects malformed hashes', async () => {
		expect(await verifyPassword('x', 'bcrypt$foo')).toBe(false);
	});
});

describe('tokens', () => {
	it('are random and hash deterministically', () => {
		const a = generateToken();
		expect(a).not.toBe(generateToken());
		expect(a.length).toBeGreaterThanOrEqual(43);
		expect(hashToken(a)).toBe(hashToken(a));
		expect(hashToken(a)).not.toBe(a);
	});
});

describe('validation', () => {
	it('normalizes emails', () => {
		expect(normalizeEmail('  Anna@Example.ORG ')).toBe('anna@example.org');
		expect(normalizeEmail('no-at-sign')).toBeNull();
		expect(normalizeEmail(null)).toBeNull();
	});

	it('only allows local redirect targets', () => {
		expect(safeNext('/profile?x=1')).toBe('/profile?x=1');
		expect(safeNext('//evil.example')).toBeNull();
		expect(safeNext('https://evil.example')).toBeNull();
		expect(safeNext('/\\evil.example')).toBeNull();
		expect(safeNext(null)).toBeNull();
	});

	it('requires passwords of reasonable length', () => {
		expect(isValidPassword('short')).toBe(false);
		expect(isValidPassword('long enough')).toBe(true);
		expect(isValidPassword('x'.repeat(300))).toBe(false);
	});
});

describe('rate limiter', () => {
	it('blocks after the limit and recovers after the window', () => {
		const limiter = createRateLimiter(2, 1000);
		expect(limiter.take('k', 0)).toBe(true);
		expect(limiter.take('k', 10)).toBe(true);
		expect(limiter.take('k', 20)).toBe(false);
		expect(limiter.take('other', 20)).toBe(true);
		expect(limiter.take('k', 1010)).toBe(true);
	});
});
