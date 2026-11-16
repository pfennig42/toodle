<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// bind:value keeps input typed before hydration (slow networks)
	// svelte-ignore state_referenced_locally
	let name = $state(form?.name ?? data.name);
</script>

<svelte:head><title>{m.onboarding_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow">
	<h1>{m.onboarding_title()}</h1>

	<form method="post" class="stack">
		<input type="hidden" name="next" value={data.next ?? ''} />
		<label class="field">
			<span>{m.onboarding_name_title()}</span>
			<input name="name" required maxlength="80" autocomplete="name" bind:value={name} />
		</label>
		{#if form?.errors?.name}<p class="error">{m.error_name()}</p>{/if}

		<input type="hidden" name="username" autocomplete="username" value={data.email} />
		<label class="field">
			<span>{m.field_password()} <span class="muted">({m.optional()})</span></span>
			<input type="password" name="password" autocomplete="new-password" minlength="10" />
			<span class="muted small">{m.onboarding_password_hint()}</span>
		</label>
		{#if form?.errors?.password}<p class="error">{m.error_password()}</p>{/if}

		<div class="actions">
			<button class="btn btn-primary">{m.onboarding_submit()}</button>
		</div>
	</form>
</section>

<style>
	h1 {
		margin-top: 0;
	}
</style>
