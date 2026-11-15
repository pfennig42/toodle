import { error } from '@sveltejs/kit';
import {
	PREF_KINDS,
	setPreference,
	userByUnsubscribeToken,
	type PrefKind
} from '#lib/server/notifications.js';
import type { Actions, PageServerLoad } from './$types';

const kindOf = (v: string | null): PrefKind | null =>
	PREF_KINDS.includes(v as PrefKind) ? (v as PrefKind) : null;

// GET only shows a button – link scanners in mail systems must not unsubscribe anybody.
export const load: PageServerLoad = ({ params, url }) => {
	const u = userByUnsubscribeToken(params.token);
	const kind = kindOf(url.searchParams.get('k'));
	if (!u || !kind) error(404);
	return { kind, email: u.email };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const u = userByUnsubscribeToken(params.token);
		const kind = kindOf(String((await request.formData()).get('kind')));
		if (!u || !kind) error(404);
		setPreference(u.id, kind, false);
		return { done: true };
	}
};
