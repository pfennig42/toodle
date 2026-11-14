import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { hashPassword } from '#lib/server/auth/crypto.js';
import { isValidPassword, safeNext } from '#lib/server/auth/validation.js';
import { addContact, addPlace, parseContact, parseName, parsePlace } from '#lib/server/profile.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user!.onboardedAt) redirect(303, next ?? '/');
	return { next, name: locals.user!.name ?? '', email: locals.user!.email };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const userId = locals.user!.id;
		const name = parseName(form.get('name'));
		const next = safeNext(form.get('next'));

		const contactValue = String(form.get('value') ?? '').trim();
		const contactInput = contactValue ? parseContact(form) : null;
		const placeInput = form.get('address') ? parsePlace(form) : null;
		const password = String(form.get('password') ?? '');

		const errors: Record<string, true> = {};
		if (!name) errors.name = true;
		if (contactValue && !contactInput) errors.contact = true;
		if (form.get('address') && !placeInput) errors.place = true;
		if (password && !isValidPassword(password)) errors.password = true;
		if (Object.keys(errors).length) {
			return fail(400, { errors, name: String(form.get('name') ?? ''), contactValue });
		}

		const passwordHash = password ? await hashPassword(password) : undefined;
		db.transaction(() => {
			if (contactInput) addContact(userId, contactInput);
			if (placeInput) addPlace(userId, placeInput);
			db.update(user)
				.set({ name: name!, onboardedAt: new Date(), ...(passwordHash && { passwordHash }) })
				.where(eq(user.id, userId))
				.run();
		});
		redirect(303, next ?? '/');
	}
};
