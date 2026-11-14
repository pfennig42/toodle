// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionUser } from '#lib/server/auth/index.js';
import type { Theme } from '#lib/theme/index.js';

declare global {
	namespace App {
		interface Locals {
			theme: Theme;
			locale: 'de' | 'en';
			user: SessionUser | null;
		}
	}
}

export {};
