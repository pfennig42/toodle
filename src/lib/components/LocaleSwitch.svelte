<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, isLocale, locales, setLocale } from '#lib/paraglide/runtime.js';

	const current = getLocale();
	/** Each language in its own name – people look for the one they read. */
	const names: Record<string, string> = {
		de: 'Deutsch',
		en: 'English',
		fr: 'Français',
		nl: 'Nederlands'
	};
</script>

<select
	aria-label={m.nav_language()}
	value={current}
	onchange={(e) => {
		const next = e.currentTarget.value;
		if (isLocale(next)) setLocale(next);
	}}
>
	{#each locales as locale (locale)}
		<option value={locale} lang={locale}>{names[locale] ?? locale}</option>
	{/each}
</select>
