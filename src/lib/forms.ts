/**
 * Registration form definition – shared by the form builder (client) and the server.
 * The special `travel` field captures arrival/departure incl. ride sharing (see docs/konzept.md 4.4).
 */
export const FIELD_TYPES = [
	'short_text',
	'long_text',
	'number',
	'date',
	'single_choice',
	'multi_choice',
	'checkbox',
	'travel'
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const TRAVEL_DIRECTIONS = ['to', 'from'] as const;
export type TravelDirection = (typeof TRAVEL_DIRECTIONS)[number];

export type FieldConfig = {
	/** single_choice / multi_choice */
	options?: string[];
	/** travel */
	directions?: TravelDirection[];
	/** Further reading for guests, e.g. the privacy policy – any question type except travel */
	links?: FieldLink[];
};

export type FieldLink = { url: string; text: string };

export type FieldDef = {
	/** Existing field id; missing for fields added in the builder. */
	id?: string;
	type: FieldType;
	label: string;
	help: string;
	required: boolean;
	config: FieldConfig;
};

export const MAX_FIELDS = 40;
export const LABEL_MAX = 200;
export const HELP_MAX = 500;
export const OPTION_MAX = 120;
export const MAX_OPTIONS = 30;
export const LINK_URL_MAX = 500;
export const LINK_TEXT_MAX = 120;
export const MAX_LINKS = 5;

/**
 * Normalizes a web address typed by an organizer: "example.org/datenschutz" gets https://.
 * Only http(s) – never javascript: or data: links in guests' forms. Empty → null.
 */
export function normalizeLinkUrl(input: string): string | null | 'invalid' {
	const raw = input.trim();
	if (!raw) return null;
	const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
	if (withScheme.length > LINK_URL_MAX) return 'invalid';
	try {
		const url = new URL(withScheme);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'invalid';
		if (!url.hostname.includes('.') && url.hostname !== 'localhost') return 'invalid';
		return url.href;
	} catch {
		return 'invalid';
	}
}

/** What guests see as link text: the given text, or else the bare host name. */
export function linkLabel(link: FieldLink): string {
	if (link.text) return link.text;
	try {
		return new URL(link.url).hostname.replace(/^www\./, '');
	} catch {
		return link.url;
	}
}

export const hasOptions = (type: FieldType) => type === 'single_choice' || type === 'multi_choice';

export type FormDefinitionError =
	| { kind: 'invalid' }
	| { kind: 'too_many' }
	| { kind: 'label'; index: number }
	| { kind: 'options'; index: number }
	| { kind: 'link'; index: number }
	| { kind: 'travel_twice' };

/** Validates and normalizes builder output. Never trusts the client. */
export function parseFormDefinition(
	input: unknown
): { ok: true; fields: FieldDef[] } | { ok: false; error: FormDefinitionError } {
	if (!Array.isArray(input)) return { ok: false, error: { kind: 'invalid' } };
	if (input.length > MAX_FIELDS) return { ok: false, error: { kind: 'too_many' } };

	const fields: FieldDef[] = [];
	let travelSeen = false;

	for (const [index, raw] of input.entries()) {
		if (typeof raw !== 'object' || raw === null) return { ok: false, error: { kind: 'invalid' } };
		const r = raw as Record<string, unknown>;
		const type = r.type as FieldType;
		if (!FIELD_TYPES.includes(type)) return { ok: false, error: { kind: 'invalid' } };

		const label = typeof r.label === 'string' ? r.label.trim() : '';
		if (!label || label.length > LABEL_MAX) return { ok: false, error: { kind: 'label', index } };
		const help = typeof r.help === 'string' ? r.help.trim().slice(0, HELP_MAX) : '';
		const id = typeof r.id === 'string' && r.id ? r.id : undefined;
		const rawConfig = (typeof r.config === 'object' && r.config) || {};
		const config: FieldConfig = {};

		if (hasOptions(type)) {
			const options = Array.isArray((rawConfig as FieldConfig).options)
				? (rawConfig as FieldConfig).options!
				: [];
			const cleaned = [
				...new Set(
					options
						.filter((o): o is string => typeof o === 'string')
						.map((o) => o.trim())
						.filter(Boolean)
				)
			];
			if (
				cleaned.length < 2 ||
				cleaned.length > MAX_OPTIONS ||
				cleaned.some((o) => o.length > OPTION_MAX)
			)
				return { ok: false, error: { kind: 'options', index } };
			config.options = cleaned;
		}

		if (type === 'travel') {
			if (travelSeen) return { ok: false, error: { kind: 'travel_twice' } };
			travelSeen = true;
			const dirs = Array.isArray((rawConfig as FieldConfig).directions)
				? (rawConfig as FieldConfig).directions!.filter((d) => TRAVEL_DIRECTIONS.includes(d))
				: [];
			config.directions = dirs.length
				? TRAVEL_DIRECTIONS.filter((d) => dirs.includes(d))
				: ['to', 'from'];
		}

		const rawLinks = (rawConfig as FieldConfig).links;
		if (type !== 'travel' && Array.isArray(rawLinks)) {
			const links: FieldLink[] = [];
			for (const raw of rawLinks) {
				if (typeof raw !== 'object' || raw === null) continue;
				const url = normalizeLinkUrl(typeof raw.url === 'string' ? raw.url : '');
				const text = typeof raw.text === 'string' ? raw.text.trim() : '';
				if (url === 'invalid' || text.length > LINK_TEXT_MAX)
					return { ok: false, error: { kind: 'link', index } };
				if (url) links.push({ url, text }); // a link without address is simply left out
			}
			if (links.length > MAX_LINKS) return { ok: false, error: { kind: 'link', index } };
			if (links.length) config.links = links;
		}

		fields.push({ id, type, label, help, required: r.required === true, config });
	}
	return { ok: true, fields };
}
