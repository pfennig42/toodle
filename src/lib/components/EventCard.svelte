<script lang="ts">
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatRange } from '#lib/datetime.js';
	import type { RegistrationState } from '#lib/event-status.js';
	import { m } from '#lib/paraglide/messages.js';
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
			startHasTime: boolean;
			endHasTime: boolean;
			state: RegistrationState;
			/** on the waiting list (participant's view) */
			waiting?: boolean;
		};
	} = $props();

	const where = $derived([event.locationName, event.locationArea].filter(Boolean).join(', '));
	// little calendar sheet: day and month of the start, in the event's time zone
	const day = $derived(
		new Intl.DateTimeFormat(getLocale(), { day: 'numeric', timeZone: event.timezone }).format(
			event.startsAt
		)
	);
	const month = $derived(
		new Intl.DateTimeFormat(getLocale(), { month: 'short', timeZone: event.timezone })
			.format(event.startsAt)
			.replace('.', '')
	);
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is resolved by the caller -->
<a class="event-card" href={href ?? resolve('/events/[id]', { id: event.id })}>
	<span class="sheet" aria-hidden="true">
		<span class="month">{month}</span>
		<span class="day">{day}</span>
	</span>
	<span class="text">
		<span class="top">
			<strong>{event.title}</strong>
			{#if !href}<StateBadge state={event.state} />{/if}
		</span>
		<span class="muted small"
			>{formatRange(event.startsAt, event.endsAt, event.timezone, getLocale(), event)}</span
		>
		{#if where}<span class="muted small">{where}</span>{/if}
		{#if event.waiting}<span class="small waiting">⏳ {m.waitlist_title()}</span>{/if}
	</span>
</a>

<style>
	.waiting {
		color: var(--coral);
		font-weight: 600;
	}

	.event-card {
		display: grid;
		grid-template-columns: 3.25rem 1fr;
		gap: var(--space-4);
		align-items: start;
		padding: var(--space-4);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
		color: var(--text);
		text-decoration: none;
		transition: box-shadow 0.15s;
	}

	.event-card:hover {
		box-shadow: 0 4px 18px rgb(0 0 0 / 0.1);
	}

	.sheet {
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		border-radius: calc(var(--radius) - 2px);
		background: var(--surface-2);
		line-height: 1.1;
	}

	.month {
		width: 100%;
		padding: 0.15rem 0;
		background: var(--accent);
		color: var(--surface);
		font-size: 0.7rem;
		font-weight: 700;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.day {
		padding: 0.3rem 0 0.35rem;
		font-size: 1.35rem;
		font-weight: 700;
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-3);
	}
</style>
