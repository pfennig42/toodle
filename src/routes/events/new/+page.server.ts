import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { emptyFormValues, formValuesFromEvent, formValuesFromForm } from '#lib/event-form.js';
import {
	createEvent,
	defaultFields,
	getEventForOrganizer,
	parseEventDetails,
	updateEventDetails
} from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * Step 1 of creating an event: the basics. `?id=` comes back from step 2 – then the
 * already created event is edited instead of creating a second one.
 */
export const load: PageServerLoad = ({ url, locals }) => {
	const id = url.searchParams.get('id');
	if (id) {
		const e = getEventForOrganizer(id, locals.user!.id);
		if (!e) error(404);
		return { values: formValuesFromEvent(e, locals.user!.email), id };
	}
	return { values: emptyFormValues(locals.user!.email), id: null };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const parsed = parseEventDetails(form, { requireLocation: true });
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: formValuesFromForm(form) });

		const id = url.searchParams.get('id');
		if (id) {
			const e = getEventForOrganizer(id, locals.user!.id);
			if (!e) error(404);
			updateEventDetails(e.id, parsed.details);
			redirect(303, `/events/new/${e.id}`);
		}
		const created = createEvent(
			locals.user!.id,
			parsed.details,
			defaultFields(m.field_travel_default_label())
		);
		redirect(303, `/events/new/${created.id}`);
	}
};
