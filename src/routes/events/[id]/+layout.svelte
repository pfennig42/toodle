<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from '#lib/components/Icon.svelte';
	import StateBadge from '#lib/components/StateBadge.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const id = $derived(data.event.id);

	/** Everything that sets the event up – grouped under one tab with its own sub-navigation. */
	const settingsPages = $derived([
		{ href: resolve('/events/[id]/settings', { id }), label: m.settings_general() },
		{ href: resolve('/events/[id]/details', { id }), label: m.event_tab_details() },
		{ href: resolve('/events/[id]/form', { id }), label: m.event_tab_form() },
		{ href: resolve('/events/[id]/team', { id }), label: m.event_tab_team() }
	]);
	const inSettings = $derived(settingsPages.some((p) => p.href === page.url.pathname));

	/** What happens around the guests. */
	const tabs = $derived([
		{ href: resolve('/events/[id]', { id }), label: m.event_tab_overview() },
		{ href: resolve('/events/[id]/participants', { id }), label: m.event_tab_participants() },
		{ href: resolve('/events/[id]/planning', { id }), label: m.event_tab_planning() },
		{ href: resolve('/events/[id]/rides', { id }), label: m.event_tab_rides() }
	]);
</script>

<svelte:head><title>{data.event.title} · {m.app_name()}</title></svelte:head>

<div class="event-head">
	<h1>{data.event.title}</h1>
	<div class="meta">
		<StateBadge state={data.event.state} />
		<!-- settings: apart from the guest-related tabs, always reachable (also on phones) -->
		<a
			class="btn small settings-link"
			href={settingsPages[0].href}
			aria-current={inSettings ? 'page' : undefined}
		>
			<Icon name="sliders" size={18} />
			<span>{m.event_tab_settings()}</span>
		</a>
	</div>
</div>

<nav class="tabs" aria-label={m.event_tabs()}>
	{#each tabs as tab (tab.href)}
		<a href={tab.href} aria-current={page.url.pathname === tab.href ? 'page' : undefined}
			>{tab.label}</a
		>
	{/each}
</nav>

{#if inSettings}
	<nav class="subnav" aria-label={m.event_tab_settings()}>
		{#each settingsPages as p (p.href)}
			<a href={p.href} aria-current={page.url.pathname === p.href ? 'page' : undefined}>{p.label}</a
			>
		{/each}
	</nav>
{/if}

{@render children()}

<style>
	.event-head {
		display: grid;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.event-head h1 {
		margin: 0;
		overflow-wrap: break-word;
		hyphens: auto;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.settings-link {
		flex-shrink: 0;
		gap: var(--space-2);
		font-size: 0.9rem;
	}

	.settings-link[aria-current='page'] {
		background: var(--surface-2);
		border-color: var(--accent);
	}

	@media (max-width: 40rem) {
		.tabs a {
			padding: 0 var(--space-2);
			font-size: 0.92rem;
		}
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

	.subnav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: calc(-1 * var(--space-2)) 0 var(--space-4);
	}

	.subnav a {
		display: inline-flex;
		align-items: center;
		min-height: 2.25rem;
		padding: 0 var(--space-3);
		border-radius: 999px;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
	}

	.subnav a[aria-current='page'] {
		background: var(--surface-2);
		color: var(--text);
		font-weight: 600;
	}

	.tabs a[aria-current='page'] {
		color: var(--text);
		font-weight: 600;
		border-bottom-color: var(--accent);
	}
</style>
