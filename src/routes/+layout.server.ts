import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies }) => {
	// one-time notice set by an action right before a redirect (e.g. after the login link)
	const flash = cookies.get('toodle-flash') === 'login' ? ('login' as const) : null;
	if (flash) cookies.delete('toodle-flash', { path: '/' });
	return {
		theme: locals.theme,
		user: locals.user && { name: locals.user.name, email: locals.user.email },
		flash
	};
};
