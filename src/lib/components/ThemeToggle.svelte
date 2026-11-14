<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { THEME_COOKIE, THEMES, type Theme } from '#lib/theme/index.js';

	let { initial }: { initial: Theme } = $props();
	let chosen = $state<Theme | null>(null);
	const theme = $derived(chosen ?? initial);

	const labels: Record<Theme, () => string> = {
		system: m.theme_system,
		light: m.theme_light,
		dark: m.theme_dark
	};

	function choose(next: Theme) {
		chosen = next;
		document.documentElement.dataset.theme = next;
		document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
	}
</script>

<div class="segmented" role="group" aria-label={m.theme_label()}>
	{#each THEMES as t (t)}
		<button type="button" aria-pressed={t === theme} onclick={() => choose(t)}>{labels[t]()}</button
		>
	{/each}
</div>
