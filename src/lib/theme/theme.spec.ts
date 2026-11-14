import { describe, expect, it } from 'vitest';
import { parseTheme } from './index';

describe('theme', () => {
	it('parses known values and falls back to system', () => {
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme('purple')).toBe('system');
		expect(parseTheme(undefined)).toBe('system');
	});
});
