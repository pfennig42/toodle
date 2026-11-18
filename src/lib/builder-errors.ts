import { m } from './paraglide/messages.js';
import type { FormDefinitionError } from './forms.js';

/** Message for a rejected form definition (form builder). */
export function builderErrorText(err: FormDefinitionError | null | undefined): string | null {
	if (!err) return null;
	switch (err.kind) {
		case 'label':
			return m.builder_error_label({ number: err.index + 1 });
		case 'options':
			return m.builder_error_options({ number: err.index + 1 });
		case 'link':
			return m.builder_error_link({ number: err.index + 1 });
		case 'too_many':
			return m.builder_error_too_many();
		case 'travel_twice':
			return m.builder_error_travel_twice();
		default:
			return m.builder_error_invalid();
	}
}
