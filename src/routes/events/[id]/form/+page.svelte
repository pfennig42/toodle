<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import FormBuilder from '#lib/components/FormBuilder.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let saving = $state(false);

	const errorText = $derived.by(() => {
		const err = form && 'error' in form ? form.error : null;
		if (!err) return null;
		switch (err.kind) {
			case 'label':
				return m.builder_error_label({ number: err.index + 1 });
			case 'options':
				return m.builder_error_options({ number: err.index + 1 });
			case 'too_many':
				return m.builder_error_too_many();
			case 'travel_twice':
				return m.builder_error_travel_twice();
			default:
				return m.builder_error_invalid();
		}
	});
</script>

<p class="muted intro">{m.builder_intro()}</p>

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
	.intro {
		margin-bottom: var(--space-4);
	}

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
