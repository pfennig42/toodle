<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const label = $derived(
		{
			confirmation: m.profile_notify_confirmation,
			rides: m.profile_notify_rides,
			reminders: m.profile_notify_reminders
		}[data.kind]()
	);
</script>

<svelte:head><title>{m.unsubscribe_title()} · {m.app_name()}</title></svelte:head>

<div class="narrow stack">
	<h1>{m.unsubscribe_title()}</h1>
	{#if form?.done}
		<p class="card" role="status">{m.unsubscribe_done({ kind: label })}</p>
	{:else}
		<p>{m.unsubscribe_question({ kind: label, email: data.email })}</p>
		<form method="post" use:enhance>
			<input type="hidden" name="kind" value={data.kind} />
			<button class="btn btn-primary">{m.unsubscribe_submit()}</button>
		</form>
	{/if}
	<p class="small muted">
		{m.unsubscribe_profile_hint()} <a href={resolve('/profile')}>{m.nav_profile()}</a>
	</p>
</div>
