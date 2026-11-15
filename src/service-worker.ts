/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `toodle-${version}`;
/** Pages seen while online (own dashboard, event pages, ride view) – the offline copy. */
const PAGES = `toodle-pages-${version}`;
const OFFLINE_PAGE = '/offline.html';

// Manifest paths are relative to the base path; turn them into absolute pathnames.
const ASSETS = [...immutable, ...assets].map(
	({ path }) => new URL(path, sw.registration.scope).pathname
);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	// Old versions go entirely – cached pages reference the old build's files.
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE && k !== PAGES).map((k) => caches.delete(k)))
			)
			.then(() => sw.clients.claim())
	);
});

/**
 * Which pages are kept for offline use: the dashboard and participant pages of events
 * (`/e/<slug>`, `/e/<slug>/rides`), each including SvelteKit's `__data.json`.
 */
function isOfflinePage(url: URL): boolean {
	const path = url.pathname.replace(/\/__data\.json$/, '') || '/';
	return path === '/' || /^\/e\/[^/]+(\/rides)?\/?$/.test(path);
}

/** Requests that change who is logged in – the offline copy belongs to the previous user. */
function changesUser(request: Request, url: URL): boolean {
	if (request.method !== 'POST') return false;
	return (
		url.pathname === '/logout' ||
		url.pathname === '/login' ||
		url.pathname.startsWith('/auth/') ||
		(url.pathname === '/profile' && url.search.includes('deleteAccount'))
	);
}

async function networkFirst(request: Request): Promise<Response> {
	const cache = await caches.open(PAGES);
	try {
		const response = await fetch(request);
		if (response.ok && !response.redirected && response.type === 'basic') {
			await cache.put(request, response.clone());
		}
		return response;
	} catch {
		const hit = await cache.match(request);
		if (hit) return hit;
		if (request.mode === 'navigate') {
			const offline = await caches.match(OFFLINE_PAGE);
			if (offline) return offline;
		}
		return Response.error();
	}
}

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;

	if (changesUser(event.request, url)) {
		event.waitUntil(caches.delete(PAGES));
		return;
	}
	if (event.request.method !== 'GET') return;

	// Static build assets: cache first.
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request)));
		return;
	}
	if (isOfflinePage(url)) {
		event.respondWith(networkFirst(event.request));
		return;
	}
	// Any other page: network, with a friendly offline page instead of the browser error.
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request).catch(async () => (await caches.match(OFFLINE_PAGE)) ?? Response.error())
		);
	}
});

sw.addEventListener('message', (event) => {
	if (event.data === 'clear-pages') event.waitUntil(caches.delete(PAGES));
});
