<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import EventCard from '#lib/components/EventCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#if page.url.searchParams.has('deleted')}
	<p class="card notice" role="status">{m.home_deleted()}</p>
{/if}

{#if data.events}
	{#if data.registered.length}
		<h2 class="section-title">{m.dashboard_registered()}</h2>
		<ul class="cards">
			{#each data.registered as event (event.id)}
				<li><EventCard {event} href={resolve('/e/[slug]', { slug: event.slug })} /></li>
			{/each}
		</ul>
	{/if}

	<div class="head" class:spaced-top={data.registered.length > 0}>
		<h1>{m.dashboard_title()}</h1>
		<a class="btn btn-primary" href={resolve('/events/new')}>{m.event_new()}</a>
	</div>

	{#if data.events.current.length}
		<ul class="cards">
			{#each data.events.current as event (event.id)}
				<li><EventCard {event} /></li>
			{/each}
		</ul>
	{:else}
		<section class="card empty">
			<p>{m.dashboard_empty()}</p>
			<a class="btn btn-primary" href={resolve('/events/new')}>{m.event_new()}</a>
		</section>
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
{:else}
	<section class="card">
		<h1>{m.app_tagline()}</h1>
		<p>{m.home_intro()}</p>
		<a class="btn btn-primary" href={resolve('/login')}>{m.home_start()}</a>
	</section>
{/if}

<style>
	.notice {
		margin-bottom: var(--space-4);
		padding: var(--space-4);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.head h1 {
		margin: 0;
	}

	.spaced-top {
		margin-top: var(--space-8);
	}

	.section-title {
		margin-bottom: var(--space-3);
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
		text-align: center;
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
