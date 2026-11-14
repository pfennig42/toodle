import { error, fail } from '@sveltejs/kit';
import { parseFormDefinition } from '#lib/forms.js';
import { getEventForOrganizer, listFields, saveFields } from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => ({
	fields: listFields(params.id).map(({ id, type, label, help, required, config }) => ({
		id,
		type,
		label,
		help,
		required,
		config
	}))
});

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		let raw: unknown;
		try {
			raw = JSON.parse(String((await request.formData()).get('fields') ?? ''));
		} catch {
			return fail(400, { error: { kind: 'invalid' as const } });
		}
		const parsed = parseFormDefinition(raw);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		saveFields(e.id, parsed.fields);
		return { saved: true };
	}
};
