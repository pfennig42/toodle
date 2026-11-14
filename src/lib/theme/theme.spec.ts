import { describe, expect, it } from 'vitest';
import { nextTheme, parseTheme } from './index';

describe('theme', () => {
	it('parses known values and falls back to system', () => {
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme('purple')).toBe('system');
		expect(parseTheme(undefined)).toBe('system');
	});

	it('cycles system → light → dark → system', () => {
		expect(nextTheme('system')).toBe('light');
		expect(nextTheme('light')).toBe('dark');
		expect(nextTheme('dark')).toBe('system');
	});
});
