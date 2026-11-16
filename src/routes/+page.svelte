<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import EventCard from '#lib/components/EventCard.svelte';
	import Landing from '#lib/components/Landing.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const firstName = $derived(data.user?.name?.split(' ')[0] ?? '');
</script>

{#if page.url.searchParams.has('deleted')}
	<p class="card notice" role="status">{m.home_deleted()}</p>
{/if}

{#if data.events}
	<h1 class="hello">{m.dashboard_hello({ name: firstName })}</h1>

	{#if data.registered.length}
		<section class="block">
			<h2>{m.dashboard_registered()}</h2>
			<ul class="cards">
				{#each data.registered as event (event.id)}
					<li><EventCard {event} href={resolve('/e/[slug]', { slug: event.slug })} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="block">
		<div class="head">
			<h2>{m.dashboard_title()}</h2>
			{#if data.events.current.length}
				<a class="btn btn-primary" href={resolve('/events/new')}>+ {m.event_new()}</a>
			{/if}
		</div>

		{#if data.events.current.length}
			<ul class="cards">
				{#each data.events.current as event (event.id)}
					<li><EventCard {event} /></li>
				{/each}
			</ul>
		{:else}
			<!-- nothing organized yet: one quiet invitation, no second button above it -->
			<div class="empty">
				<p class="muted">{m.dashboard_empty()}</p>
				<a class={data.registered.length ? 'btn' : 'btn btn-primary'} href={resolve('/events/new')}
					>{m.event_new()}</a
				>
			</div>
		{/if}
		{#if data.events.past.length}
			<details class="group">
				<summary>{m.dashboard_past()} ({data.events.past.length})</summary>
				<ul class="cards">
					{#each data.events.past as event (event.id)}
						<li><EventCard {event} /></li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if data.events.archived.length}
			<details class="group">
				<summary>{m.dashboard_archived()} ({data.events.archived.length})</summary>
				<ul class="cards">
					{#each data.events.archived as event (event.id)}
						<li><EventCard {event} /></li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>
{:else}
	<Landing />
{/if}

<style>
	.notice {
		margin-bottom: var(--space-4);
		padding: var(--space-4);
	}

	.hello {
		margin: var(--space-2) 0 var(--space-6);
	}

	.block + .block {
		margin-top: var(--space-8);
	}

	h2 {
		margin: 0 0 var(--space-3);
		font-size: 1.2rem;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.head h2 {
		margin: 0;
	}

	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.empty p {
		margin: 0;
	}

	.group {
		margin-top: var(--space-6);
	}

	.group summary {
		cursor: pointer;
		font-weight: 600;
		min-height: var(--touch);
		display: flex;
		align-items: center;
		margin-bottom: var(--space-2);
	}
</style>
