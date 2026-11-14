<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';

	const current = getLocale();
</script>

<div class="switch" role="group" aria-label={m.nav_language()}>
	{#each locales as locale (locale)}
		<button
			type="button"
			class:active={locale === current}
			aria-pressed={locale === current}
			onclick={() => setLocale(locale)}>{locale.toUpperCase()}</button
		>
	{/each}
</div>

<style>
	.switch {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	button {
		border: 0;
		background: var(--surface);
		padding: var(--space-2) var(--space-3);
		line-height: 1;
		cursor: pointer;
		font-size: 0.85rem;
	}

	button.active {
		background: var(--accent-soft);
		font-weight: 600;
	}
</style>
