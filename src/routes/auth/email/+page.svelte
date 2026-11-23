<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.email_change_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow stack">
	{#if form?.changed}
		<h1>{m.email_change_done_title()}</h1>
		<p role="status">{m.email_change_done_text({ email: form.newEmail ?? '' })}</p>
		<a class="btn btn-primary align-start" href={resolve('/profile')}
			>{m.email_change_to_profile()}</a
		>
	{:else if data.newEmail && !form?.error}
		<h1>{m.email_change_title()}</h1>
		<p>{m.email_change_confirm_text({ email: data.newEmail })}</p>
		<form method="post">
			<input type="hidden" name="token" value={data.token} />
			<button class="btn btn-primary">{m.email_change_confirm()}</button>
		</form>
	{:else}
		<h1>{m.link_invalid_title()}</h1>
		<p>{form?.error === 'taken' ? m.email_change_taken() : m.email_change_invalid()}</p>
		<a class="btn btn-primary align-start" href={resolve('/profile')}
			>{m.email_change_to_profile()}</a
		>
	{/if}
</section>
