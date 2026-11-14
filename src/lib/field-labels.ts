import { m } from './paraglide/messages.js';
import type { FieldType } from './forms.js';

export function fieldTypeLabel(type: FieldType): string {
	return {
		short_text: m.field_type_short_text,
		long_text: m.field_type_long_text,
		number: m.field_type_number,
		date: m.field_type_date,
		single_choice: m.field_type_single_choice,
		multi_choice: m.field_type_multi_choice,
		checkbox: m.field_type_checkbox,
		travel: m.field_type_travel
	}[type]();
}

export function fieldTypeIcon(type: FieldType): string {
	return {
		short_text: 'Aa',
		long_text: '¶',
		number: '#',
		date: '▦',
		single_choice: '◉',
		multi_choice: '☑',
		checkbox: '✓',
		travel: '⇄'
	}[type];
}
