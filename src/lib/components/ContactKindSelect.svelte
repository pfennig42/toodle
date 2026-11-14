<script lang="ts">
	import { CONTACT_KINDS } from '#lib/contacts.js';
	import { contactKindLabel } from '#lib/labels.js';

	let { value = $bindable('phone') }: { value?: string } = $props();
</script>

<select name="kind" bind:value>
	{#each CONTACT_KINDS as kind (kind)}
		<option value={kind}>{contactKindLabel(kind)}</option>
	{/each}
</select>
