<script lang="ts">
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatRange } from '#lib/datetime.js';
	import type { RegistrationState } from '#lib/event-status.js';
	import StateBadge from './StateBadge.svelte';

	let {
		event,
		href
	}: {
		/** Defaults to the management page */
		href?: string;
		event: {
			id: string;
			title: string;
			locationName: string;
			locationArea: string | null;
			startsAt: Date;
			endsAt: Date;
			timezone: string;
			state: RegistrationState;
		};
	} = $props();

	const where = $derived([event.locationName, event.locationArea].filter(Boolean).join(', '));
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is resolved by the caller -->
<a class="event-card" href={href ?? resolve('/events/[id]', { id: event.id })}>
	<span class="top">
		<strong>{event.title}</strong>
		{#if !href}<StateBadge state={event.state} />{/if}
	</span>
	<span class="muted small"
		>{formatRange(event.startsAt, event.endsAt, event.timezone, getLocale())}</span
	>
	{#if where}<span class="muted small">{where}</span>{/if}
</a>

<style>
	.event-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		text-decoration: none;
	}

	.event-card:hover {
		border-color: var(--accent);
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-3);
	}
</style>
