<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import FormBuilder from '#lib/components/FormBuilder.svelte';
	import { builderErrorText } from '#lib/builder-errors.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let saving = $state(false);

	const errorText = $derived(builderErrorText(form && 'error' in form ? form.error : null));
</script>

<form
	method="post"
	novalidate
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			// Reloads the fields (now with ids); the builder is re-created below.
			await update({ reset: false });
			saving = false;
		};
	}}
>
	{#if errorText}<p class="card error-box" role="alert">{errorText}</p>{/if}
	{#key data.fields}
		<FormBuilder initial={data.fields} {saving} />
	{/key}
	{#if form && 'saved' in form}<p class="muted small saved" role="status">{m.saved()}</p>{/if}
</form>

<style>
	.saved {
		margin-top: var(--space-2);
	}

	.error-box {
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-3);
		color: var(--danger);
		border-color: var(--danger);
	}
</style>
