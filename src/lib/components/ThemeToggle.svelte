<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { nextTheme, THEME_COOKIE, type Theme } from '#lib/theme/index.js';

	let { initial }: { initial: Theme } = $props();
	let chosen = $state<Theme | null>(null);
	const theme = $derived(chosen ?? initial);

	const labels: Record<Theme, () => string> = {
		system: m.theme_system,
		light: m.theme_light,
		dark: m.theme_dark
	};
	const icons: Record<Theme, string> = { system: '◐', light: '☀', dark: '☾' };

	function cycle() {
		const next = nextTheme(theme);
		chosen = next;
		document.documentElement.dataset.theme = next;
		document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
	}
</script>

<button
	type="button"
	class="btn icon-btn"
	onclick={cycle}
	title="{m.theme_label()}: {labels[theme]()}"
>
	<span aria-hidden="true">{icons[theme]}</span>
	<span class="visually-hidden">{m.theme_label()}: {labels[theme]()}</span>
</button>

<style>
	.icon-btn {
		padding: var(--space-2) var(--space-3);
		line-height: 1;
	}
</style>
