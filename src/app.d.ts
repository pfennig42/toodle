// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Theme } from '#lib/theme/index.js';

declare global {
	namespace App {
		interface Locals {
			theme: Theme;
		}
	}
}

export {};
