/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `toodle-${version}`;
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
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

// Static build assets: cache first. Everything else (pages, data, API) goes to the network –
// offline support for own registrations follows in a later milestone.
sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin || !ASSETS.includes(url.pathname)) return;
	event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request)));
});
