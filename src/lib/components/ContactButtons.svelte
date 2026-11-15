<script lang="ts">
	import type { ContactKind } from '#lib/contacts.js';
	import { contactHref } from '#lib/contact-links.js';
	import { contactKindLabel } from '#lib/labels.js';
	import { m } from '#lib/paraglide/messages.js';

	let { contacts }: { contacts: { kind: ContactKind; value: string }[] } = $props();
</script>

{#if contacts.length}
	<div class="contacts">
		{#each contacts as c (c.kind + c.value)}
			{@const href = contactHref(c.kind, c.value)}
			{#if href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external app link -->
				<a class="btn small" {href} target="_blank" rel="noopener noreferrer"
					>{contactKindLabel(c.kind)}</a
				>
			{:else}
				<span class="btn small static">{contactKindLabel(c.kind)}: {c.value}</span>
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

	.static {
		cursor: text;
		user-select: all;
	}

	.none {
		margin: 0;
	}
</style>
