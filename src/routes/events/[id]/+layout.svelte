<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import StateBadge from '#lib/components/StateBadge.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = $derived([
		{ href: resolve('/events/[id]', { id: data.event.id }), label: m.event_tab_overview() },
		{
			href: resolve('/events/[id]/participants', { id: data.event.id }),
			label: m.event_tab_participants()
		},
		{
			href: resolve('/events/[id]/planning', { id: data.event.id }),
			label: m.event_tab_planning()
		},
		{ href: resolve('/events/[id]/rides', { id: data.event.id }), label: m.event_tab_rides() },
		{ href: resolve('/events/[id]/details', { id: data.event.id }), label: m.event_tab_details() },
		{ href: resolve('/events/[id]/form', { id: data.event.id }), label: m.event_tab_form() },
		{ href: resolve('/events/[id]/team', { id: data.event.id }), label: m.event_tab_team() }
	]);
</script>

<svelte:head><title>{data.event.title} · {m.app_name()}</title></svelte:head>

<div class="event-head">
	<h1>{data.event.title}</h1>
	<StateBadge state={data.event.state} />
</div>

<nav class="tabs" aria-label={m.event_tabs()}>
	{#each tabs as tab (tab.href)}
		<a href={tab.href} aria-current={page.url.pathname === tab.href ? 'page' : undefined}
			>{tab.label}</a
		>
	{/each}
</nav>

{@render children()}

<style>
	.event-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin-bottom: var(--space-3);
	}

	.event-head h1 {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.tabs {
		display: flex;
		gap: var(--space-1);
		margin: 0 calc(-1 * var(--space-4)) var(--space-4);
		padding: 0 var(--space-4);
		overflow-x: auto;
		scrollbar-width: none;
		border-bottom: 1px solid var(--border);
	}

	.tabs a {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding: 0 var(--space-3);
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
		border-bottom: 3px solid transparent;
		margin-bottom: -1px;
	}

	.tabs a[aria-current='page'] {
		color: var(--text);
		font-weight: 600;
		border-bottom-color: var(--accent);
	}
</style>
