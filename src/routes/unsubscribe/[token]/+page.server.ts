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
// The POST comes from that button, or straight from the mail program ("Abbestellen" next to the
// sender, RFC 8058: body `List-Unsubscribe=One-Click`, the kind is in the URL then).
export const load: PageServerLoad = ({ params, url }) => {
	const u = userByUnsubscribeToken(params.token);
	const kind = kindOf(url.searchParams.get('k'));
	if (!u || !kind) error(404);
	return { kind, email: u.email };
};

export const actions: Actions = {
	default: async ({ params, request, url }) => {
		const u = userByUnsubscribeToken(params.token);
		const data = await request.formData().catch(() => new FormData());
		const kind = kindOf(
			data.get('List-Unsubscribe') === 'One-Click'
				? url.searchParams.get('k')
				: (data.get('kind') as string | null)
		);
		if (!u || !kind) error(404);
		setPreference(u.id, kind, false);
		return { done: true };
	}
};
