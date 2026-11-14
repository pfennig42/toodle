import { describe, expect, it } from 'vitest';
import { addressWithoutName } from './location';

describe('addressWithoutName', () => {
	it('drops a leading venue name', () => {
		expect(
			addressWithoutName('Jugendhof Waldheim', 'Jugendhof Waldheim, Am Wald 3, Waldheim')
		).toBe('Am Wald 3, Waldheim');
	});

	it('keeps other addresses untouched', () => {
		expect(addressWithoutName('Zeltplatz', 'Am Wald 3, Waldheim')).toBe('Am Wald 3, Waldheim');
		expect(addressWithoutName('', 'Am Wald 3')).toBe('Am Wald 3');
		expect(addressWithoutName('X', null)).toBeNull();
	});
});
