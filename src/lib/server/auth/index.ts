import type { Cookies } from '@sveltejs/kit';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { dev } from '$app/env';
import { db } from '../db/index.js';
import { loginToken, session, user, type User } from '../db/schema.js';
import { generateToken, hashToken } from './crypto.js';

export const SESSION_COOKIE = 'toodle-session';
const SESSION_DAYS = 60;
const RENEW_BELOW_DAYS = 30;
const LOGIN_TOKEN_MINUTES = 15;
const DAY = 24 * 60 * 60 * 1000;

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'locale' | 'onboardedAt'> & {
	hasPassword: boolean;
};

export function createSession(userId: string, cookies: Cookies) {
	const token = generateToken();
	const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
	db.insert(session)
		.values({ id: hashToken(token), userId, expiresAt })
		.run();
	setSessionCookie(cookies, token, expiresAt);
}

function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: expiresAt
	});
}

export function validateSession(cookies: Cookies): SessionUser | null {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const id = hashToken(token);
	const row = db
		.select({ session, user })
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, id))
		.get();
	const now = Date.now();
	if (!row || row.session.expiresAt.getTime() <= now) {
		if (row) db.delete(session).where(eq(session.id, id)).run();
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	if (row.session.expiresAt.getTime() - now < RENEW_BELOW_DAYS * DAY) {
		const expiresAt = new Date(now + SESSION_DAYS * DAY);
		db.update(session).set({ expiresAt }).where(eq(session.id, id)).run();
		setSessionCookie(cookies, token, expiresAt);
	}
	const { id: userId, email, name, locale, onboardedAt, passwordHash } = row.user;
	return { id: userId, email, name, locale, onboardedAt, hasPassword: passwordHash !== null };
}

export function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token)
		db.delete(session)
			.where(eq(session.id, hashToken(token)))
			.run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Log out everywhere else, e.g. after a password change. */
export function destroyOtherSessions(userId: string, cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	const keep = token ? hashToken(token) : '';
	for (const s of db.select().from(session).where(eq(session.userId, userId)).all()) {
		if (s.id !== keep) db.delete(session).where(eq(session.id, s.id)).run();
	}
}

/** Creates a single-use magic-link token and returns the raw token for the mail. */
export function createLoginToken(email: string, next: string | null): string {
	const token = generateToken();
	db.delete(loginToken).where(lt(loginToken.expiresAt, new Date())).run();
	db.insert(loginToken)
		.values({
			id: hashToken(token),
			email,
			next,
			expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60 * 1000)
		})
		.run();
	return token;
}

function findUsableToken(token: string) {
	return db
		.select()
		.from(loginToken)
		.where(
			and(
				eq(loginToken.id, hashToken(token)),
				isNull(loginToken.usedAt),
				gt(loginToken.expiresAt, new Date())
			)
		)
		.get();
}

export function isLoginTokenUsable(token: string): boolean {
	return findUsableToken(token) !== undefined;
}

/** Consumes the token and returns the (possibly newly created) user plus redirect target. */
export function consumeLoginToken(token: string): { user: User; next: string | null } | null {
	return db.transaction((tx) => {
		const row = findUsableToken(token);
		if (!row) return null;
		tx.update(loginToken).set({ usedAt: new Date() }).where(eq(loginToken.id, row.id)).run();
		let account = tx.select().from(user).where(eq(user.email, row.email)).get();
		if (!account) account = tx.insert(user).values({ email: row.email }).returning().get();
		return { user: account, next: row.next };
	});
}

/** Where to go after login: onboarding first, then the requested page. */
export function afterLoginTarget(account: Pick<User, 'onboardedAt'>, next: string | null) {
	if (!account.onboardedAt)
		return next ? `/onboarding?next=${encodeURIComponent(next)}` : '/onboarding';
	return next ?? '/';
}
