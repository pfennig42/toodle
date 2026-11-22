import { error, fail, redirect } from '@sveltejs/kit';
import { parseFormDefinition } from '#lib/forms.js';
import {
	getEventForOrganizer,
	listFields,
	publishBlockers,
	saveFields,
	setEventStatus
} from '#lib/server/events.js';
import type { Actions, PageServerLoad } from './$types';

/** Step 2 of creating an event: the registration form. Finishing publishes the event. */
export const load: PageServerLoad = ({ params, locals }) => {
	const e = getEventForOrganizer(params.id, locals.user!.id);
	if (!e) error(404);
	return {
		event: { id: e.id, title: e.title },
		fields: listFields(e.id).map(({ id, type, label, help, required, config }) => ({
			id,
			type,
			label,
			help,
			required,
			config
		}))
	};
};

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

		// Done – no separate "publish" step. If something still blocks it (e.g. the date is
		// in the past), the overview explains what is missing.
		if (e.status === 'draft' && publishBlockers(e, locals.user!).length === 0) {
			setEventStatus(e.id, 'published');
			redirect(303, `/events/${e.id}?published=1`);
		}
		redirect(303, `/events/${e.id}`);
	}
};
