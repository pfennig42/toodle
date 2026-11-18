<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatDateTime, formatRange } from '#lib/datetime.js';
	import { LARGE_EVENT } from '#lib/ride-visibility.js';
	import ShareBox from '#lib/components/ShareBox.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ev = $derived(data.event);
	const o = $derived(data.overview);
	const locale = getLocale();
	const where = $derived([o.locationName, o.locationArea].filter(Boolean).join(', '));
</script>

{#snippet share()}
	<ShareBox url={ev.publicUrl} slug={ev.slug} title={ev.title} qr={data.qr} />
{/snippet}

<div class="stack-lg">
	{#if data.published}
		<!-- just published: celebrate, then the one thing to do next -->
		<section class="hero stack" aria-labelledby="hero-title">
			<p class="hero-emoji" aria-hidden="true">🎉</p>
			<h2 id="hero-title">{m.overview_published_title()}</h2>
			<p>{m.overview_published_text()}</p>
			{@render share()}
		</section>
	{:else if ev.status === 'draft'}
		<section class="draft stack" aria-labelledby="draft-title">
			<h2 id="draft-title">{m.overview_draft_title()}</h2>
			<p class="muted">{m.event_status_draft_hint()}</p>
			{#if o.blockers.includes('location')}
				<p class="error small">{m.event_blocker_location()}</p>
			{/if}
			{#if o.blockers.includes('contact')}
				<p class="error small">{m.event_blocker_contact()}</p>
			{/if}
			{#if o.blockers.includes('past')}
				<p class="error small">{m.event_blocker_past()}</p>
			{/if}
			{#if form?.error === 'blocked'}<p class="error small">{m.event_blocker_generic()}</p>{/if}
			<div class="actions">
				<form method="post" action="?/publish" use:enhance>
					<button class="btn btn-primary" disabled={o.blockers.length > 0}
						>{m.event_publish()}</button
					>
				</form>
				<a class="btn" href={resolve('/events/new/[id]', { id: ev.id })}
					>{m.event_setup_continue()}</a
				>
			</div>
		</section>
	{/if}

	<div class="facts">
		<p>{formatRange(o.startsAt, o.endsAt, o.timezone, locale, o)}</p>
		{#if where}<p class="muted">{where}</p>{/if}
	</div>

	<ul class="numbers">
		<li>
			<a href={resolve('/events/[id]/participants', { id: ev.id })}>
				<strong>{o.registrations}{o.capacity ? ` / ${o.capacity}` : ''}</strong>
				<span>{m.overview_registrations()}</span>
			</a>
		</li>
		{#if o.hasTravel}
			<li>
				<a href={resolve('/events/[id]/rides', { id: ev.id })}>
					<strong>{o.seekingOpen}</strong>
					<span>{m.overview_seeking_open()}</span>
				</a>
			</li>
		{/if}
		<li>
			<a href={resolve('/events/[id]/settings', { id: ev.id })}>
				<strong class="date"
					>{o.registrationDeadline
						? formatDateTime(o.registrationDeadline, o.timezone, locale, o.deadlineHasTime)
						: '–'}</strong
				>
				<span>{m.overview_deadline()}</span>
			</a>
		</li>
	</ul>

	{#if o.hasTravel && o.rideVisibility === 'public' && o.registrations > LARGE_EVENT}
		<section class="suggest stack" aria-label={m.event_rides_visibility()}>
			<p>{m.overview_visibility_hint({ count: o.registrations })}</p>
			<a class="btn small align-start" href={resolve('/events/[id]/details', { id: ev.id })}
				>{m.overview_visibility_action()}</a
			>
		</section>
	{/if}

	{#if !data.published && ev.status !== 'draft'}
		<section class="stack" aria-labelledby="share-title">
			<h2 id="share-title">{m.overview_share_title()}</h2>
			{#if ev.status === 'archived'}
				<p class="muted small">{m.event_status_archived_hint()}</p>
			{:else}
				{@render share()}
			{/if}
		</section>
	{/if}
</div>

<style>
	h2 {
		margin: 0;
	}

	p {
		margin: 0;
	}

	.hero {
		padding: var(--space-6) var(--space-4);
		border-radius: var(--radius);
		background: var(--accent-soft);
	}

	.hero h2 {
		font-size: 1.4rem;
	}

	.hero-emoji {
		font-size: 2rem;
		line-height: 1;
	}

	.draft {
		padding: var(--space-4);
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.suggest {
		padding: var(--space-4);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.align-start {
		align-self: flex-start;
	}

	.facts {
		display: grid;
		gap: var(--space-1);
	}

	/* a few numbers, each leading to where the details are */
	.numbers {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: var(--space-2);
	}

	.numbers a {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		height: 100%;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		text-decoration: none;
	}

	.numbers a:hover {
		background: var(--surface-2);
	}

	.numbers strong {
		font-size: 1.6rem;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.numbers strong.date {
		font-size: 1rem;
		font-weight: 600;
	}

	.numbers span {
		color: var(--text-muted);
		font-size: 0.85rem;
	}
</style>
