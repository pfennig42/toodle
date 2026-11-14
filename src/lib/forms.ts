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
};

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

export const hasOptions = (type: FieldType) => type === 'single_choice' || type === 'multi_choice';

export type FormDefinitionError =
	| { kind: 'invalid' }
	| { kind: 'too_many' }
	| { kind: 'label'; index: number }
	| { kind: 'options'; index: number }
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

		fields.push({ id, type, label, help, required: r.required === true, config });
	}
	return { ok: true, fields };
}
