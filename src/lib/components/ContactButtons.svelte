<script lang="ts">
	import type { ContactOption } from '#lib/contacts.js';
	import { contactHref } from '#lib/contact-links.js';
	import { contactName } from '#lib/labels.js';
	import { m } from '#lib/paraglide/messages.js';

	let { contacts }: { contacts: ContactOption[] } = $props();
</script>

{#if contacts.length}
	<div class="contacts">
		{#each contacts as c (c.kind + c.value)}
			{@const href = contactHref(c.kind, c.value)}
			{#if href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external app link -->
				<a class="btn small" {href} target="_blank" rel="noopener noreferrer"
					>{contactName(c)}{#if c.kind !== 'other'}<span class="value">{c.value}</span>{/if}</a
				>
			{:else}
				<span class="btn small static">{contactName(c)}<span class="value">{c.value}</span></span>
			{/if}
		{/each}
	</div>
{:else}
	<p class="muted small none">{m.rides_no_contact()}</p>
{/if}

<style>
	.contacts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/* the number or ID itself – so it's clear what the button does, and it can be copied */
	.value {
		margin-left: 0.4em;
		font-weight: 400;
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	.static {
		cursor: text;
		user-select: all;
	}

	.none {
		margin: 0;
	}
</style>
