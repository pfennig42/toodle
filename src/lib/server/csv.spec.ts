import { describe, expect, it } from 'vitest';
import { fileSlug, safeCell, toCsv } from './csv.js';

describe('safeCell', () => {
	it('neutralizes formulas', () => {
		expect(safeCell('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
		expect(safeCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
		expect(safeCell('+cmd|x')).toBe(`'+cmd|x`);
		expect(safeCell('-1+2')).toBe(`'-1+2`);
	});

	it('leaves phone numbers and plain text alone', () => {
		expect(safeCell('+49 170 1234567')).toBe('+49 170 1234567');
		expect(safeCell('-5')).toBe('-5');
		expect(safeCell('Anna')).toBe('Anna');
	});
});

describe('toCsv', () => {
	it('uses semicolons, quotes where needed and starts with a BOM', () => {
		const csv = toCsv([
			['Name', 'Kommentar'],
			['Anna', 'Hallo; "du"\nzweite Zeile']
		]);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
		expect(csv.slice(1)).toBe('Name;Kommentar\r\nAnna;"Hallo; ""du""\nzweite Zeile"\r\n');
	});
});

describe('fileSlug', () => {
	it('creates safe file names', () => {
		expect(fileSlug('Sommerfreizeit 2027!')).toBe('sommerfreizeit-2027');
		expect(fileSlug('Größe & Übung')).toBe('grosse-ubung');
		expect(fileSlug('"; rm -rf')).toBe('rm-rf');
		expect(fileSlug('!!!')).toBe('export');
	});
});
