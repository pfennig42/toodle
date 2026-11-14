import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { afterLoginTarget, createLoginToken, createSession } from '#lib/server/auth/index.js';
import { DUMMY_HASH, verifyPassword } from '#lib/server/auth/crypto.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import { normalizeEmail, safeNext } from '#lib/server/auth/validation.js';
import { renderMail, sendMail } from '#lib/server/mail.js';
import type { Actions, PageServerLoad } from './$types';

const QUARTER_HOUR = 15 * 60 * 1000;
const linkPerEmail = createRateLimiter(3, QUARTER_HOUR);
const linkPerIp = createRateLimiter(10, QUARTER_HOUR);
const passwordPerEmail = createRateLimiter(10, QUARTER_HOUR);
const passwordPerIp = createRateLimiter(30, QUARTER_HOUR);

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user) redirect(303, next ?? '/');
	return { next };
};

async function sendLoginLink(email: string, next: string | null, origin: string) {
	const token = createLoginToken(email, next);
	const link = `${origin}/auth/link?token=${encodeURIComponent(token)}`;
	await sendMail({
		to: email,
		subject: m.mail_login_subject(),
		...renderMail({
			paragraphs: [m.mail_login_intro(), m.mail_login_validity()],
			action: { label: m.mail_login_button(), url: link },
			footer: m.mail_login_footer()
		})
	});
}

export const actions: Actions = {
	password: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		const password = form.get('password');
		const next = safeNext(form.get('next'));
		if (!email)
			return fail(400, { email: String(form.get('email') ?? ''), error: 'email' as const });

		// No password entered → fall back to the magic link
		if (typeof password !== 'string' || password === '') {
			return sendLink(email, next, url.origin, getClientAddress());
		}

		if (!passwordPerEmail.take(email) || !passwordPerIp.take(getClientAddress())) {
			return fail(429, { email, error: 'rate' as const });
		}
		const account = db.select().from(user).where(eq(user.email, email)).get();
		const ok = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
		if (!account?.passwordHash || !ok) return fail(400, { email, error: 'credentials' as const });

		createSession(account.id, cookies);
		redirect(303, afterLoginTarget(account, next));
	},

	link: async ({ request, url, getClientAddress }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		const next = safeNext(form.get('next'));
		if (!email)
			return fail(400, { email: String(form.get('email') ?? ''), error: 'email' as const });
		return sendLink(email, next, url.origin, getClientAddress());
	}
};

async function sendLink(email: string, next: string | null, origin: string, ip: string) {
	if (!linkPerEmail.take(email) || !linkPerIp.take(ip)) {
		return fail(429, { email, error: 'rate' as const });
	}
	try {
		await sendLoginLink(email, next, origin);
	} catch (err) {
		console.error('[login] could not send mail', err);
		return fail(500, { email, error: 'mail' as const });
	}
	return { sent: email };
}
