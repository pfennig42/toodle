import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ TILE_URL: 'https://tiles.example/{z}/{x}/{y}.png' }));
const { parseTile, tileUrl } = await import('./tiles.js');

describe('tiles', () => {
	it('accepts tiles inside the grid only', () => {
		expect(parseTile('3', '7', '0')).toEqual({ z: 3, x: 7, y: 0 });
		expect(parseTile('3', '8', '0')).toBeNull();
		expect(parseTile('20', '0', '0')).toBeNull();
		expect(parseTile('2', '-1', '0')).toBeNull();
		expect(parseTile('2', '1e1', '0')).toBeNull();
	});

	it('fills the URL template', () => {
		expect(tileUrl({ z: 5, x: 16, y: 10 })).toBe('https://tiles.example/5/16/10.png');
	});
});
