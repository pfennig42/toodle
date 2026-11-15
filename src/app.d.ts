// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionUser } from '#lib/server/auth/index.js';
import type { Theme } from '#lib/theme/index.js';
import type { Locale } from '#lib/paraglide/runtime.js';

declare global {
	namespace App {
		interface Locals {
			theme: Theme;
			locale: Locale;
			user: SessionUser | null;
		}
	}
}

export {};
