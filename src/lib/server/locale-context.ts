import { AsyncLocalStorage } from 'node:async_hooks';
import {
	getServerAsyncLocalStorage,
	isLocale,
	overwriteServerAsyncLocalStorage,
	type Locale
} from '../paraglide/runtime.js';
import { ORIGIN } from '$app/env/private';

/**
 * Runs `fn` with a fixed Paraglide locale – for mails rendered outside the recipient's request
 * (background jobs, or a mail to someone else than the current user).
 */
export function withLocale<T>(locale: string | null | undefined, fn: () => T): T {
	let als = getServerAsyncLocalStorage();
	if (!als) {
		als = new AsyncLocalStorage() as unknown as NonNullable<typeof als>;
		overwriteServerAsyncLocalStorage(als);
	}
	const l: Locale = isLocale(locale) ? locale : 'de';
	return als.run({ locale: l, origin: ORIGIN, messageCalls: new Set() }, fn);
}
