/**
 * Registering without logging in (docs/konzept.md 5): name and e-mail at the end of the form.
 * Behind the scenes a "silent" account is created – no password, e-mail not verified – so the
 * rides view, editing and notifications work exactly as for everybody else.
 */
import { eq } from 'drizzle-orm';
import { normalizeEmail } from './auth/validation.js';
import { db } from './db/index.js';
import { user } from './db/schema.js';
import { parseName } from './profile.js';

export type GuestErrors = { name?: true; email?: true };

export type GuestParse =
	| { ok: true; name: string; email: string }
	| { ok: false; errors: GuestErrors; name: string; email: string };

/** Reads `guestName` / `guestEmail`; the typed values come back for the form on errors. */
export function parseGuest(form: FormData): GuestParse {
	const rawName = String(form.get('guestName') ?? '');
	const rawEmail = String(form.get('guestEmail') ?? '');
	const name = parseName(rawName);
	const email = normalizeEmail(rawEmail);
	if (name && email) return { ok: true, name, email };
	return {
		ok: false,
		errors: { ...(name ? {} : { name: true }), ...(email ? {} : { email: true }) },
		name: rawName.trim(),
		email: rawEmail.trim()
	};
}

/**
 * The account a guest registration belongs to. A known address keeps its account (name and
 * settings untouched) – the caller must then NOT log this device in: typing an address proves
 * nothing. An unknown address gets a new silent account, ready to use (no onboarding).
 */
export function guestAccount(
	name: string,
	email: string,
	locale: string | null
): { userId: string; created: boolean } {
	const existing = db.select({ id: user.id }).from(user).where(eq(user.email, email)).get();
	if (existing) return { userId: existing.id, created: false };
	const created = db
		.insert(user)
		.values({ email, name, locale, onboardedAt: new Date() })
		.returning({ id: user.id })
		.get();
	return { userId: created.id, created: true };
}
