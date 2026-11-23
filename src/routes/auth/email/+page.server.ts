import { fail } from '@sveltejs/kit';
import { confirmEmailChange, pendingEmailChange } from '#lib/server/auth/email-change.js';
import type { Actions, PageServerLoad } from './$types';

// Like the magic link: GET only shows what will happen – mail scanners must not change anything.
export const load: PageServerLoad = ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	return { token, newEmail: token ? pendingEmailChange(token) : null };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const token = String((await request.formData()).get('token') ?? '');
		const newEmail = pendingEmailChange(token);
		const result = confirmEmailChange(token);
		if (result !== 'changed') return fail(400, { error: result });
		return { changed: true, newEmail };
	}
};
