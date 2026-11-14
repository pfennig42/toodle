import { error, fail } from '@sveltejs/kit';
import { formValuesFromEvent, formValuesFromForm } from '#lib/event-form.js';
import { getEventForOrganizer, parseEventDetails, updateEventDetails } from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, url }) => {
	const e = getEventForOrganizer(params.id, locals.user!.id)!;
	return { values: formValuesFromEvent(e), copied: url.searchParams.has('copied') };
};

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		const form = await request.formData();
		const parsed = parseEventDetails(form);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: formValuesFromForm(form) });
		updateEventDetails(e.id, parsed.details);
		return { saved: true };
	}
};
