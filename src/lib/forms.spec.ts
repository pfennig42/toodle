import { describe, expect, it } from 'vitest';
import { linkLabel, normalizeLinkUrl, parseFormDefinition } from './forms';

const travel = { type: 'travel', label: 'Anreise & Abreise', config: {} };

describe('parseFormDefinition', () => {
	it('accepts a typical form and normalizes it', () => {
		const result = parseFormDefinition([
			travel,
			{
				id: 'f1',
				type: 'single_choice',
				label: '  Essen ',
				required: true,
				config: { options: ['Vegetarisch', ' Vegan ', '', 'Vegan', 'Alles'] }
			},
			{ type: 'checkbox', label: 'Ich bringe ein Zelt mit', help: 'falls vorhanden' }
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.fields[0].config.directions).toEqual(['to', 'from']);
		expect(result.fields[1]).toMatchObject({
			id: 'f1',
			label: 'Essen',
			required: true,
			config: { options: ['Vegetarisch', 'Vegan', 'Alles'] }
		});
		expect(result.fields[2]).toMatchObject({
			required: false,
			help: 'falls vorhanden',
			config: {}
		});
	});

	it('keeps only valid travel directions in canonical order', () => {
		const result = parseFormDefinition([
			{ ...travel, config: { directions: ['from', 'sideways'] } }
		]);
		expect(result.ok && result.fields[0].config.directions).toEqual(['from']);
	});

	it('rejects missing labels with the field index', () => {
		expect(parseFormDefinition([travel, { type: 'short_text', label: ' ' }])).toEqual({
			ok: false,
			error: { kind: 'label', index: 1 }
		});
	});

	it('requires at least two options for choices', () => {
		expect(
			parseFormDefinition([{ type: 'multi_choice', label: 'X', config: { options: ['a', 'a'] } }])
		).toEqual({ ok: false, error: { kind: 'options', index: 0 } });
	});

	it('allows only one travel field', () => {
		expect(parseFormDefinition([travel, travel])).toEqual({
			ok: false,
			error: { kind: 'travel_twice' }
		});
	});

	it('rejects unknown types and non-arrays', () => {
		expect(parseFormDefinition([{ type: 'file', label: 'Upload' }]).ok).toBe(false);
		expect(parseFormDefinition({}).ok).toBe(false);
	});
});

describe('links on questions', () => {
	it('adds https:// to bare addresses and keeps the text', () => {
		const result = parseFormDefinition([
			{
				type: 'checkbox',
				label: 'Ich habe die Datenschutzerklärung gelesen',
				config: {
					links: [
						{ url: ' example.org/datenschutz ', text: ' Datenschutzerklärung ' },
						{ url: 'https://example.org/agb', text: '' }
					]
				}
			}
		]);
		expect(result.ok && result.fields[0].config.links).toEqual([
			{ url: 'https://example.org/datenschutz', text: 'Datenschutzerklärung' },
			{ url: 'https://example.org/agb', text: '' }
		]);
	});

	it('drops an empty link', () => {
		const result = parseFormDefinition([
			{ type: 'short_text', label: 'Allergien', config: { links: [{ url: '  ', text: 'x' }] } }
		]);
		expect(result.ok && result.fields[0].config).toEqual({});
	});

	it('rejects anything but web addresses', () => {
		for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.org', 'kein link']) {
			expect(
				parseFormDefinition([
					{ type: 'short_text', label: 'Q', config: { links: [{ url, text: '' }] } }
				])
			).toEqual({ ok: false, error: { kind: 'link', index: 0 } });
		}
	});

	it('ignores links on the travel field', () => {
		const result = parseFormDefinition([
			{ ...travel, config: { links: [{ url: 'https://example.org', text: '' }] } }
		]);
		expect(result.ok && result.fields[0].config.links).toBeUndefined();
	});

	it('allows at most five links', () => {
		const links = Array.from({ length: 6 }, (_, i) => ({ url: `example.org/${i}`, text: '' }));
		expect(parseFormDefinition([{ type: 'checkbox', label: 'Q', config: { links } }])).toEqual({
			ok: false,
			error: { kind: 'link', index: 0 }
		});
	});

	it('shows the host when there is no text', () => {
		expect(linkLabel({ url: 'https://www.example.org/datenschutz', text: '' })).toBe('example.org');
		expect(normalizeLinkUrl('http://example.org')).toBe('http://example.org/');
	});
});
