import { error, fail } from '@sveltejs/kit';
import { formValuesFromEvent, formValuesFromForm } from '#lib/event-form.js';
import { widensVisibility } from '#lib/ride-visibility.js';
import {
	detailsChange,
	getEventForOrganizer,
	listFields,
	parseEventDetails,
	requireOrganizerEvent,
	updateEventDetails
} from '#lib/server/events.js';
import { notifyEventChanged } from '#lib/server/notifications.js';
import { countActiveRegistrations, shiftTravelDays } from '#lib/server/registrations.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, url }) => {
	const e = requireOrganizerEvent(params.id, locals.user!.id);
	return {
		values: formValuesFromEvent(e, locals.user!.email),
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

		// Other days or another place: travel plans move along, and the people registered hear
		// about it (drafts have nobody to tell).
		const change = detailsChange(e, parsed.details);
		const hasTravel = listFields(e.id).some((f) => f.type === 'travel');
		const travelMoved = hasTravel && (change.shiftDays.to !== 0 || change.shiftDays.from !== 0);
		if (travelMoved) shiftTravelDays(e.id, change.shiftDays, parsed.details.timezone);
		const notified =
			e.status === 'published' &&
			(change.when || change.where) &&
			countActiveRegistrations(e.id) > 0;
		if (notified)
			void notifyEventChanged(e.id, { when: change.when, where: change.where, travelMoved });
		return { saved: true, notified };
	}
};
