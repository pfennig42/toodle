import { fail, redirect } from '@sveltejs/kit';
import {
	afterLoginTarget,
	consumeLoginToken,
	createSession,
	destroySession,
	isLoginTokenUsable
} from '#lib/server/auth/index.js';
import type { Actions, PageServerLoad } from './$types';

// The link only shows a confirmation button: mail scanners that prefetch links
// must not be able to use up the single-use token.
export const load: PageServerLoad = ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	return { token, valid: token !== '' && isLoginTokenUsable(token) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const token = String((await request.formData()).get('token') ?? '');
		const result = consumeLoginToken(token);
		if (!result) return fail(400, { invalid: true });
		destroySession(cookies);
		createSession(result.user.id, cookies);
		redirect(303, afterLoginTarget(result.user, result.next));
	}
};
