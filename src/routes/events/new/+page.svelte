<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import EventDetailsForm from '#lib/components/EventDetailsForm.svelte';
	import SetupSteps from '#lib/components/SetupSteps.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.event_new()} · {m.app_name()}</title></svelte:head>

<h1>{m.event_new()}</h1>
<SetupSteps current={1} />
<p class="muted">{m.event_new_intro()}</p>

<!-- posts to the current URL – keeps ?id= when coming back from step 2 -->
<form method="post" class="card">
	<EventDetailsForm
		values={form?.values ?? data.values}
		errors={form?.errors ?? []}
		submitLabel={m.setup_next()}
	/>
</form>
