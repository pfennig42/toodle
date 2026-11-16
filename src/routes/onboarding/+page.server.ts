import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { hashPassword } from '#lib/server/auth/crypto.js';
import { isValidPassword, safeNext } from '#lib/server/auth/validation.js';
import { parseName } from '#lib/server/profile.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * First login: only the account itself (name, optional password). Contact options and places
 * are asked for where they matter – when registering for an event with rides.
 */
export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user!.onboardedAt) redirect(303, next ?? '/');
	return { next, name: locals.user!.name ?? '', email: locals.user!.email };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const name = parseName(form.get('name'));
		const next = safeNext(form.get('next'));
		const password = String(form.get('password') ?? '');

		const errors: Record<string, true> = {};
		if (!name) errors.name = true;
		if (password && !isValidPassword(password)) errors.password = true;
		if (Object.keys(errors).length) {
			return fail(400, { errors, name: String(form.get('name') ?? '') });
		}

		const passwordHash = password ? await hashPassword(password) : undefined;
		db.update(user)
			.set({ name: name!, onboardedAt: new Date(), ...(passwordHash && { passwordHash }) })
			.where(eq(user.id, locals.user!.id))
			.run();
		redirect(303, next ?? '/');
	}
};
