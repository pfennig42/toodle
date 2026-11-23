/**
 * CSRF protection – SvelteKit's own check (switched off in vite.config.ts), with one exception:
 * the unsubscribe links in mails. Gmail & co. post `List-Unsubscribe=One-Click` to them from their
 * servers, without an Origin of ours (RFC 8058). That's safe: the secret token in the URL is the
 * permission, and all it can do is switch off mails.
 */
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CROSS_SITE_ALLOWED = ['/unsubscribe/'];

/** Same rule as SvelteKit: a form-like post whose Origin isn't ours is refused. */
export function isCsrfForbidden(request: Request, url: URL): boolean {
	if (!MUTATING.has(request.method)) return false;
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
	if (type && !FORM_TYPES.includes(type)) return false;
	if (request.headers.get('origin') === url.origin) return false;
	return !CROSS_SITE_ALLOWED.some((p) => url.pathname.startsWith(p));
}
