import { error, fail } from '@sveltejs/kit';
import { formValuesFromEvent, formValuesFromForm } from '#lib/event-form.js';
import { widensVisibility } from '#lib/ride-visibility.js';
import { getEventForOrganizer, parseEventDetails, updateEventDetails } from '#lib/server/events.js';
import { countActiveRegistrations } from '#lib/server/registrations.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, url }) => {
	const e = getEventForOrganizer(params.id, locals.user!.id)!;
	return {
		values: formValuesFromEvent(e),
		savedVisibility: e.rideVisibility,
		registrations: countActiveRegistrations(e.id),
		copied: url.searchParams.has('copied')
	};
};

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const e = getEventForOrganizer(params.id, locals.user!.id);
		if (!e) error(404);
		const form = await request.formData();
		const parsed = parseEventDetails(form);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: formValuesFromForm(form) });
		// People registered under the old terms – showing their rides to more people needs a yes.
		if (
			widensVisibility(e.rideVisibility, parsed.details.rideVisibility) &&
			countActiveRegistrations(e.id) > 0 &&
			form.get('confirmWiden') !== 'on'
		)
			return fail(400, {
				errors: ['visibility_widen' as const],
				values: formValuesFromForm(form)
			});
		updateEventDetails(e.id, parsed.details);
		return { saved: true };
	}
};
