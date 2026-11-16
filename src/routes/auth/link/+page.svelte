<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let formEl: HTMLFormElement | undefined = $state();
	let auto = $state(false);

	// Log in straight away – no extra click. Without JavaScript the button stays.
	onMount(() => {
		if (!formEl) return;
		auto = true;
		formEl.requestSubmit();
	});
</script>

<svelte:head><title>{m.login_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow">
	{#if data.valid && !form?.invalid}
		<form method="post" bind:this={formEl} class="stack">
			<input type="hidden" name="token" value={data.token} />
			{#if auto}
				<p class="busy" role="status">
					<span class="spinner" aria-hidden="true"></span>{m.link_busy()}
				</p>
			{:else}
				<h1>{m.link_title()}</h1>
				<button class="btn btn-primary">{m.link_submit()}</button>
			{/if}
		</form>
	{:else}
		<h1>{m.link_invalid_title()}</h1>
		<p>{m.link_invalid_text()}</p>
		<a class="btn btn-primary" href={resolve('/login')}>{m.link_request_new()}</a>
	{/if}
</section>

<style>
	.busy {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: 0;
	}

	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
