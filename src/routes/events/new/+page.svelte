<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import EventDetailsForm from '#lib/components/EventDetailsForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.event_new()} · {m.app_name()}</title></svelte:head>

<h1>{m.event_new()}</h1>
<p class="muted">{m.event_new_intro()}</p>

<form method="post" class="card">
	<EventDetailsForm
		values={form?.values ?? data.values}
		errors={form?.errors ?? []}
		submitLabel={m.event_create()}
	/>
</form>
