<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatDateTime, formatRange } from '#lib/datetime.js';
	import { addressWithoutName } from '#lib/location.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const ev = $derived(data.event);
	const address = $derived(addressWithoutName(ev.locationName, ev.locationAddress));
	const mapUrl = $derived(
		ev.lat !== null && ev.lon !== null
			? `https://www.openstreetmap.org/?mlat=${ev.lat}&mlon=${ev.lon}#map=15/${ev.lat}/${ev.lon}`
			: null
	);
</script>

<svelte:head>
	<title>{ev.title} · {m.app_name()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if ev.state === 'draft'}
	<p class="card banner" role="status">
		{m.public_preview_banner()}
		<a href={resolve('/events/[id]', { id: ev.id })}>{m.public_back_to_manage()}</a>
	</p>
{/if}

<article class="stack-lg">
	<header class="stack">
		<h1>{ev.title}</h1>
		<dl class="facts">
			<div>
				<dt>{m.event_when()}</dt>
				<dd>{formatRange(ev.startsAt, ev.endsAt, ev.timezone, getLocale())}</dd>
			</div>
			{#if ev.locationName || ev.locationAddress}
				<div>
					<dt>{m.event_where()}</dt>
					<dd>
						{#if ev.locationName}{ev.locationName}<br />{/if}
						{#if address}<span class="muted">{address}</span>{/if}
						{#if mapUrl}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external link -->
							<a href={mapUrl} target="_blank" rel="noopener noreferrer">{m.public_map()}</a>
						{/if}
					</dd>
				</div>
			{/if}
			{#if ev.registrationDeadline}
				<div>
					<dt>{m.event_deadline()}</dt>
					<dd>{formatDateTime(ev.registrationDeadline, ev.timezone, getLocale())}</dd>
				</div>
			{/if}
		</dl>
	</header>

	{#if ev.description}
		<section class="card description">{ev.description}</section>
	{/if}

	<section class="card stack">
		<h2>{m.public_registration_title()}</h2>
		{#if ev.state === 'open' || ev.state === 'draft'}
			<p class="muted">{m.public_registration_soon()}</p>
		{:else if ev.state === 'past'}
			<p class="muted">{m.public_state_past()}</p>
		{:else}
			<p class="muted">{m.public_state_closed()}</p>
		{/if}
		{#if data.isOrganizer && data.fields.length}
			<details>
				<summary>{m.public_form_preview({ count: data.fields.length })}</summary>
				<ul class="preview">
					{#each data.fields as field (field.id)}
						<li>{field.label}{field.required ? ' *' : ''}</li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>
</article>

<style>
	.banner {
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-4);
		background: color-mix(in srgb, var(--coral) 15%, var(--surface));
		border-color: transparent;
	}

	h1 {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.facts {
		display: grid;
		gap: var(--space-3);
		margin: 0;
	}

	.facts dt {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.facts dd {
		margin: 0;
	}

	.facts a {
		display: inline-block;
		margin-top: var(--space-1);
	}

	.description {
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	h2 {
		margin: 0;
	}

	.card p {
		margin: 0;
	}

	summary {
		cursor: pointer;
		min-height: var(--touch);
		display: flex;
		align-items: center;
	}

	.preview {
		margin: 0;
		padding-left: var(--space-6);
	}
</style>
