import { fail, redirect } from '@sveltejs/kit';
import {
	afterLoginTarget,
	consumeLoginToken,
	createSession,
	destroySession,
	isLoginTokenUsable
} from '#lib/server/auth/index.js';
import type { Actions, PageServerLoad } from './$types';

// GET never uses up the single-use token: mail scanners prefetch links. The page submits
// itself right away via JavaScript (scanners fetching plain HTML don't); the button is
// only the fallback without JavaScript.
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
		// one-time "you're logged in" banner on the next page (onboarding greets on its own)
		if (result.user.onboardedAt) cookies.set('toodle-flash', 'login', { path: '/', maxAge: 60 });
		redirect(303, afterLoginTarget(result.user, result.next));
	}
};
