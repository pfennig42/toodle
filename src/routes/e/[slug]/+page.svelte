<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatDateTime, formatRange } from '#lib/datetime.js';
	import { addressWithoutName } from '#lib/location.js';
	import RegistrationForm from '#lib/components/RegistrationForm.svelte';
	import RegistrationSummary from '#lib/components/RegistrationSummary.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let editing = $state(false);
	const ev = $derived(data.event);
	const address = $derived(addressWithoutName(ev.locationName, ev.locationAddress));
	const reg = $derived(data.registration?.status === 'active' ? data.registration : null);
	const near = $derived(ev.lat !== null && ev.lon !== null ? { lat: ev.lat, lon: ev.lon } : null);
	// Travel details stay editable after the deadline (plans change); answers don't.
	const canEditTravel = $derived(
		!!reg && (ev.state === 'open' || ev.state === 'deadline' || ev.state === 'closed')
	);
	const canRegister = $derived(ev.state === 'open' && !data.full);
	const showForm = $derived(
		data.loggedIn && ((reg && editing && canEditTravel) || (!reg && canRegister))
	);
	const formErrors = $derived(
		form && 'error' in form && form.error === 'invalid'
			? { answers: form.answerErrors, travel: form.travelErrors }
			: { answers: {}, travel: {} }
	);
	const loginHref = $derived(`/login?next=${encodeURIComponent(`/e/${ev.slug}`)}`);

	$effect(() => {
		// Close the editor after a successful save
		if (form && 'saved' in form) editing = false;
	});
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

	<section class="card stack" id="registration">
		<h2>{m.public_registration_title()}</h2>

		{#if form && 'saved' in form && form.wasRegistered}
			<p class="success" role="status">{m.registration_updated_notice()}</p>
		{/if}
		{#if form && 'withdrawn' in form}
			<p class="muted" role="status">{m.registration_withdrawn_notice()}</p>
		{/if}

		{#if reg && !editing}
			<p class="registered" role="status">✓ {m.registration_you_are_registered()}</p>
			<RegistrationSummary
				fields={data.fields}
				answers={reg.answers}
				legs={reg.legs}
				comment={reg.comment}
				timezone={ev.timezone}
			/>
			{#if !data.hasContact}
				<p class="hint small">
					{m.registration_no_contact_hint()}
					<a href={resolve('/profile')}>{m.registration_add_contact()}</a>
				</p>
			{/if}
			<a class="btn btn-primary align-start" href={resolve('/e/[slug]/rides', { slug: ev.slug })}
				>{m.rides_open()}</a
			>
			<div class="actions">
				{#if canEditTravel}
					<button type="button" class="btn" onclick={() => (editing = true)}>
						{ev.state === 'open' ? m.registration_edit() : m.registration_edit_travel()}
					</button>
				{/if}
				{#if ev.state !== 'past' && ev.state !== 'archived'}
					<details class="withdraw">
						<summary class="btn">{m.registration_withdraw()}</summary>
						<form method="post" action="?/withdraw" class="stack" use:enhance>
							<p class="small muted">{m.registration_withdraw_confirm()}</p>
							<button class="btn btn-danger">{m.registration_withdraw_submit()}</button>
						</form>
					</details>
				{/if}
			</div>
		{:else if showForm}
			{#if reg}<p class="muted small">{m.registration_editing_hint()}</p>{/if}
			<RegistrationForm
				fields={data.fields}
				answers={reg?.answers ?? data.registration?.answers ?? {}}
				comment={reg?.comment ?? data.registration?.comment ?? ''}
				travelInput={data.travelInput}
				savedPlaces={data.savedPlaces}
				{near}
				answersLocked={!!reg && ev.state !== 'open'}
				isUpdate={!!reg}
				answerErrors={formErrors.answers}
				travelErrors={formErrors.travel}
				oncancel={reg ? () => (editing = false) : undefined}
			/>
		{:else if ev.state === 'open' && data.full}
			<p class="muted">{m.registration_full()}</p>
		{:else if ev.state === 'open' && !data.loggedIn}
			<p>{m.registration_login_hint()}</p>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- login with return path -->
			<a class="btn btn-primary align-start" href={loginHref}>{m.registration_login_button()}</a>
		{:else if ev.state === 'draft'}
			<p class="muted">{m.registration_draft_hint()}</p>
		{:else if ev.state === 'past'}
			<p class="muted">{m.public_state_past()}</p>
		{:else}
			<p class="muted">{m.public_state_closed()}</p>
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

	.registered {
		font-weight: 600;
		color: var(--accent);
	}

	.success {
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--accent-soft);
	}

	.hint {
		padding: var(--space-3);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--coral) 12%, var(--surface));
	}

	.align-start {
		align-self: flex-start;
	}

	.withdraw summary {
		list-style: none;
	}

	.withdraw summary::-webkit-details-marker {
		display: none;
	}

	.withdraw[open] summary {
		margin-bottom: var(--space-3);
	}
</style>
