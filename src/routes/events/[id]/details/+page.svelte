<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import EventDetailsForm from '#lib/components/EventDetailsForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

{#if data.copied}
	<p class="card notice" role="status">{m.event_copied_notice()}</p>
{/if}

<form
	method="post"
	class="card"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	{#key data.values}
		<EventDetailsForm
			values={form?.values ?? data.values}
			errors={form?.errors ?? []}
			submitLabel={m.save()}
			savedVisibility={data.savedVisibility}
			registrations={data.registrations}
			offerNotify={data.event.status === 'published' && data.registrations > 0}
		/>
	{/key}
	{#if form?.saved}
		<p class="muted small saved" role="status">
			{form.notified ? `${m.saved()} ${m.details_notified()}` : m.saved()}
		</p>
	{/if}
</form>

<style>
	.notice {
		padding: var(--space-4);
		margin-bottom: var(--space-4);
		background: var(--accent-soft);
		border-color: transparent;
	}

	.saved {
		margin-top: var(--space-3);
	}
</style>
