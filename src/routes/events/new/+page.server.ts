import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { emptyFormValues, formValuesFromForm } from '#lib/event-form.js';
import { createEvent, defaultFields, parseEventDetails } from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ values: emptyFormValues() });

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = parseEventDetails(form);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: formValuesFromForm(form) });
		const created = createEvent(
			locals.user!.id,
			parsed.details,
			defaultFields(m.field_travel_default_label())
		);
		redirect(303, `/events/${created.id}?created=1`);
	}
};
