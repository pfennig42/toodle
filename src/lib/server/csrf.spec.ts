import { describe, expect, it } from 'vitest';
import { isCsrfForbidden } from './csrf';

const url = (path: string) => new URL(`https://toodle.lu${path}`);
const req = (method: string, headers: Record<string, string> = {}) =>
	new Request('https://toodle.lu/', { method, headers });
const form = { 'content-type': 'application/x-www-form-urlencoded' };

describe('isCsrfForbidden', () => {
	it('lets our own form posts and all reads through', () => {
		expect(isCsrfForbidden(req('POST', { ...form, origin: 'https://toodle.lu' }), url('/'))).toBe(
			false
		);
		expect(isCsrfForbidden(req('GET', { origin: 'https://evil.example' }), url('/'))).toBe(false);
	});

	it('refuses form posts from elsewhere or without an origin', () => {
		const evil = { ...form, origin: 'https://evil.example' };
		expect(isCsrfForbidden(req('POST', evil), url('/profile?/deleteAccount'))).toBe(true);
		expect(isCsrfForbidden(req('POST', form), url('/profile'))).toBe(true);
		expect(isCsrfForbidden(req('DELETE'), url('/profile'))).toBe(true);
		expect(
			isCsrfForbidden(
				req('POST', { 'content-type': 'multipart/form-data; boundary=x' }),
				url('/profile')
			)
		).toBe(true);
		expect(isCsrfForbidden(req('POST', { 'content-type': 'TEXT/PLAIN' }), url('/'))).toBe(true);
	});

	it('leaves non-form posts (JSON etc.) to the endpoints, like SvelteKit', () => {
		expect(
			isCsrfForbidden(req('POST', { 'content-type': 'application/json' }), url('/api/push'))
		).toBe(false);
	});

	it('accepts the one-click unsubscribe from mail providers', () => {
		expect(isCsrfForbidden(req('POST', form), url('/unsubscribe/abc?k=rides'))).toBe(false);
		// only below /unsubscribe/, not anything that merely starts with it
		expect(isCsrfForbidden(req('POST', form), url('/unsubscribed'))).toBe(true);
	});
});
