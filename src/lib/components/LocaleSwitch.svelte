<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';

	const current = getLocale();
	const names: Record<string, string> = { de: 'Deutsch', en: 'English' };
</script>

<div class="segmented" role="group" aria-label={m.nav_language()}>
	{#each locales as locale (locale)}
		<button
			type="button"
			lang={locale}
			aria-pressed={locale === current}
			onclick={() => setLocale(locale)}>{names[locale] ?? locale}</button
		>
	{/each}
</div>
