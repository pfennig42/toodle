import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	theme: locals.theme,
	user: locals.user && { name: locals.user.name, email: locals.user.email }
});
