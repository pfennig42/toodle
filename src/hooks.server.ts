import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { runMigrations } from '#lib/server/db/index.js';
import { parseTheme, THEME_COOKIE } from '#lib/theme/index.js';

export const init: ServerInit = () => {
	runMigrations();
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		)
	);

/** Renders the chosen theme into <html data-theme> so there is no flash on load. */
const handleTheme: Handle = ({ event, resolve }) => {
	const theme = parseTheme(event.cookies.get(THEME_COOKIE));
	event.locals.theme = theme;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%toodle.theme%', theme)
	});
};

export const handle: Handle = sequence(handleTheme, handleParaglide);
