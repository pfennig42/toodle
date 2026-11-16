<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { builderErrorText } from '#lib/builder-errors.js';
	import FormBuilder from '#lib/components/FormBuilder.svelte';
	import SetupSteps from '#lib/components/SetupSteps.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let saving = $state(false);
	const errorText = $derived(builderErrorText(form && 'error' in form ? form.error : null));
</script>

<svelte:head><title>{data.event.title} · {m.app_name()}</title></svelte:head>

<h1>{data.event.title}</h1>
<SetupSteps current={2} />

<form
	method="post"
	novalidate
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	{#if errorText}<p class="card error-box" role="alert">{errorText}</p>{/if}
	<FormBuilder initial={data.fields} {saving} finishLabel={m.setup_finish()} />
</form>

<p class="back">
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved path plus query -->
	<a href={`${resolve('/events/new')}?id=${data.event.id}`}>← {m.setup_back()}</a>
</p>

<style>
	h1 {
		margin-bottom: var(--space-2);
	}

	.back {
		margin-top: var(--space-4);
	}

	.error-box {
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-3);
		color: var(--danger);
		border-color: var(--danger);
	}
</style>
