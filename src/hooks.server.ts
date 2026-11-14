import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { eq } from 'drizzle-orm';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { db, runMigrations } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { validateSession } from '#lib/server/auth/index.js';
import { parseTheme, THEME_COOKIE } from '#lib/theme/index.js';

export const init: ServerInit = () => {
	runMigrations();
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.locals.locale = locale;
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

/** Renders the chosen theme into <html data-theme> so there is no flash on load. */
const handleTheme: Handle = ({ event, resolve }) => {
	const theme = parseTheme(event.cookies.get(THEME_COOKIE));
	event.locals.theme = theme;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%toodle.theme%', theme)
	});
};

/** Pages that need a logged-in user. */
const PROTECTED = ['/onboarding', '/profile', '/api', '/events', '/invite'];
/** Pages a not-yet-onboarded user may visit. */
const ONBOARDING_ALLOWED = ['/onboarding', '/logout', '/auth', '/api', '/healthz'];

const startsWithAny = (path: string, prefixes: string[]) =>
	prefixes.some((p) => path === p || path.startsWith(p + '/'));

const handleAuth: Handle = ({ event, resolve }) => {
	const current = validateSession(event.cookies);
	event.locals.user = current;
	const path = event.url.pathname;

	if (!current && startsWithAny(path, PROTECTED)) {
		if (path.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
		redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
	}
	if (current && !current.onboardedAt && !startsWithAny(path, ONBOARDING_ALLOWED)) {
		redirect(303, `/onboarding?next=${encodeURIComponent(path + event.url.search)}`);
	}
	return resolve(event);
};

/** Remember the UI language on the account (used for mails sent later, e.g. notifications). */
const handleUserLocale: Handle = ({ event, resolve }) => {
	const current = event.locals.user;
	if (current && current.locale !== event.locals.locale) {
		db.update(user).set({ locale: event.locals.locale }).where(eq(user.id, current.id)).run();
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleTheme, handleParaglide, handleAuth, handleUserLocale);
