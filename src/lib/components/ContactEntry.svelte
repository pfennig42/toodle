<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { CONTACT_LABEL_MAX } from '#lib/contacts.js';
	import ContactKindSelect from './ContactKindSelect.svelte';

	/**
	 * One contact option to add: kind, value – and for "other" the name of the service
	 * (Threema, Matrix, …), so others know what the ID is for. Posts kind, value, contactLabel.
	 */
	let {
		kind = $bindable('phone'),
		value = $bindable(''),
		label = $bindable(''),
		input = $bindable(),
		required = false
	}: {
		kind?: string;
		value?: string;
		label?: string;
		input?: HTMLInputElement;
		required?: boolean;
	} = $props();

	const other = $derived(kind === 'other');
</script>

<div class="entry" class:other>
	<ContactKindSelect bind:value={kind} />
	{#if other}
		<input
			name="contactLabel"
			class="service"
			aria-label={m.contact_other_label()}
			placeholder={m.contact_other_label_placeholder()}
			maxlength={CONTACT_LABEL_MAX}
			required={required || !!value}
			bind:value={label}
		/>
	{/if}
	<input
		name="value"
		class="value"
		aria-label={m.contact_value()}
		placeholder={other
			? m.contact_other_value_placeholder()
			: kind === 'phone' || kind === 'whatsapp' || kind === 'signal'
				? m.contact_phone_placeholder()
				: undefined}
		{required}
		bind:value
		bind:this={input}
	/>
</div>

<style>
	.entry {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		flex: 1 1 18rem;
	}

	/* with the service's name it's three fields: the whole line, buttons below */
	.entry.other {
		flex-basis: 100%;
	}

	.entry > :global(select) {
		width: auto;
	}

	.service {
		flex: 1 1 8rem;
	}

	.value {
		flex: 3 1 12rem;
	}
</style>
