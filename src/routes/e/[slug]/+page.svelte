<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatDateTime, formatRange } from '#lib/datetime.js';
	import { addressWithoutName } from '#lib/location.js';
	import Icon from '#lib/components/Icon.svelte';
	import RegistrationForm from '#lib/components/RegistrationForm.svelte';
	import RegistrationSummary from '#lib/components/RegistrationSummary.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let editing = $state(false);
	const ev = $derived(data.event);
	const address = $derived(addressWithoutName(ev.locationName, ev.locationAddress));
	// registered – or waiting for a place (then: no rides yet)
	const reg = $derived(
		data.registration?.status === 'active' || data.registration?.status === 'waitlisted'
			? data.registration
			: null
	);
	const waiting = $derived(reg?.status === 'waitlisted');
	const near = $derived(
		ev.lat !== null && ev.lon !== null
			? { lat: ev.lat, lon: ev.lon, label: ev.locationName || ev.title }
			: null
	);
	// Travel details stay editable after the deadline (plans change); answers don't.
	const canEditTravel = $derived(
		!!reg && (ev.state === 'open' || ev.state === 'deadline' || ev.state === 'closed')
	);
	// full: still open – for the waiting list
	const canRegister = $derived(ev.state === 'open');
	// Guests: via "continue without logging in" – or back from the server with an error (a plain
	// form post goes to "?/register" and loses "?guest" on the way).
	const guestMode = $derived(!data.loggedIn && (data.guest || (!!form && 'guestName' in form)));
	const showForm = $derived(
		(data.loggedIn && ((reg && editing && canEditTravel) || (!reg && canRegister))) ||
			(guestMode && canRegister)
	);
	/** Guest whose address belongs to an existing account: registered, but not logged in here */
	const guestDone = $derived(form && 'guestSaved' in form ? form.sentTo : null);
	const sentTo = $derived(form && 'sentTo' in form ? form.sentTo : null);
	const guestValues = $derived({
		name: form && 'guestName' in form ? (form.guestName ?? '') : '',
		email: form && 'guestEmail' in form ? (form.guestEmail ?? '') : '',
		errors: form && 'guestErrors' in form ? (form.guestErrors ?? {}) : {}
	});
	const formErrors = $derived(
		form && 'error' in form && form.error === 'invalid'
			? { answers: form.answerErrors, travel: form.travelErrors, contact: !!form.contactError }
			: { answers: {}, travel: {}, contact: false }
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
	const hosts = $derived(
		new Intl.ListFormat(getLocale(), { type: 'conjunction' }).format(data.hosts)
	);
	// "12 are coming · 4 have room in their car" – only once somebody is there
	const crowd = $derived.by(() => {
		if (!data.going) return '';
		const going = data.going === 1 ? m.public_going_one() : m.public_going({ count: data.going });
		if (!data.drivers) return going;
		const drivers =
			data.drivers === 1 ? m.public_drivers_one() : m.public_drivers({ count: data.drivers });
		return `${going} · ${drivers}`;
	});
</script>

<svelte:head>
	<title>{ev.title} · {m.app_name()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if ev.state === 'draft'}
	<p class="banner" role="status">
		{m.public_preview_banner()}
		<a href={resolve('/events/[id]', { id: ev.id })}>{m.public_back_to_manage()}</a>
	</p>
{/if}

<article class="page">
	<header>
		{#if hosts}<p class="hosts">{m.public_hosted_by({ names: hosts })}</p>{/if}
		<h1>{ev.title}</h1>

		<ul class="facts">
			<li>
				<Icon name="calendar" size={20} />
				<span>{formatRange(ev.startsAt, ev.endsAt, ev.timezone, getLocale(), ev)}</span>
			</li>
			{#if ev.locationName || ev.locationAddress}
				<li>
					<Icon name="pin" size={20} />
					<span>
						{#if ev.locationName}<strong>{ev.locationName}</strong><br />{/if}
						{#if address}<span class="muted">{address}</span><br />{/if}
						{#if mapUrl}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external link -->
							<a href={mapUrl} target="_blank" rel="noopener noreferrer">{m.public_map()}</a>
						{/if}
					</span>
				</li>
			{/if}
			{#if ev.registrationDeadline}
				<li>
					<Icon name="clock" size={20} />
					<span>
						{m.public_deadline({
							date: formatDateTime(
								ev.registrationDeadline,
								ev.timezone,
								getLocale(),
								ev.deadlineHasTime
							)
						})}
					</span>
				</li>
			{/if}
			{#if crowd}
				<li>
					<Icon name="users" size={20} />
					<span>{crowd}</span>
				</li>
			{/if}
		</ul>
	</header>

	{#if ev.description}
		<p class="description">{ev.description}</p>
	{/if}

	<section class="join" id="registration">
		{#if sentTo && !guestDone}
			<p class="notice" role="status">{m.guest_sent_notice({ email: sentTo })}</p>
		{/if}
		{#if form && 'error' in form && form.error === 'guest_taken'}
			<p class="notice" role="alert">
				{m.guest_taken()}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- login with return path -->
				<a href={loginHref}>{m.guest_taken_login()}</a>
			</p>
		{:else if form && 'error' in form && form.error === 'rate'}
			<p class="error" role="alert">{m.login_error_rate()}</p>
		{/if}
		{#if form && 'saved' in form && form.wasRegistered}
			<p class="notice" role="status">{m.registration_updated_notice()}</p>
		{/if}
		{#if form && 'withdrawn' in form}
			<p class="muted" role="status">{m.registration_withdrawn_notice()}</p>
		{/if}

		{#if guestDone}
			<div role="status">
				<p class="yes">
					{form && 'waitlisted' in form && form.waitlisted
						? `⏳ ${m.waitlist_on()}`
						: `✓ ${m.registration_you_are_registered()}`}
				</p>
				<p>{m.guest_sent_notice({ email: guestDone })}</p>
				<p class="muted">{m.guest_known_hint()}</p>
			</div>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- login with return path -->
			<a class="btn align-start" href={loginHref}>{m.guest_known_login()}</a>
		{:else if reg && !editing}
			{#if waiting}
				<div role="status">
					<p class="yes">
						⏳ {m.waitlist_you_are_waiting({ position: data.waitlistPosition ?? 1 })}
					</p>
					<p class="muted">{m.waitlist_how()}</p>
				</div>
			{:else}
				<div role="status">
					<p class="yes">✓ {m.registration_you_are_registered()}</p>
					<p class="muted">{m.tagline()}</p>
				</div>
			{/if}
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
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved path plus query -->
					<a href={resolve('/profile') + `?next=${encodeURIComponent(`/e/${ev.slug}`)}`}
						>{m.registration_add_contact()}</a
					>
				</p>
			{/if}
			{#if !waiting}
				<a class="btn btn-primary align-start" href={resolve('/e/[slug]/rides', { slug: ev.slug })}
					>{m.rides_open()}</a
				>
			{/if}
			<div class="quiet-actions">
				{#if canEditTravel}
					<button type="button" class="link-btn" onclick={() => (editing = true)}>
						{ev.state === 'open' ? m.registration_edit() : m.registration_edit_travel()}
					</button>
				{/if}
				{#if ev.state !== 'past' && ev.state !== 'archived'}
					<details class="withdraw">
						<summary class="link-btn"
							>{waiting ? m.waitlist_leave() : m.registration_withdraw()}</summary
						>
						<form method="post" action="?/withdraw" class="stack-sm" use:enhance>
							<p class="small muted">{m.registration_withdraw_confirm()}</p>
							<button class="btn btn-danger align-start">{m.registration_withdraw_submit()}</button>
						</form>
					</details>
				{/if}
			</div>
		{:else if showForm}
			<h2>
				{reg ? m.registration_edit() : data.full ? m.waitlist_title() : m.public_join_title()}
			</h2>
			{#if reg}<p class="muted small">{m.registration_editing_hint()}</p>{/if}
			{#if !reg && data.full}<p class="notice">{m.waitlist_full_hint()}</p>{/if}
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
				askContact={!data.hasContact}
				contacts={data.contacts}
				contactError={formErrors.contact}
				rideVisibility={ev.rideVisibility}
				guest={guestMode ? guestValues : null}
				waitlist={!reg && data.full}
				oncancel={reg ? () => (editing = false) : undefined}
			/>
		{:else if ev.state === 'open' && !data.loggedIn}
			<h2>{data.full ? m.waitlist_title() : m.public_join_title()}</h2>
			<p>{data.full ? m.waitlist_full_hint() : m.public_join_text()}</p>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- login with return path -->
			<a class="btn btn-primary align-start" href={loginHref}>{m.public_join_button()}</a>
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
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding-top: var(--space-2);
	}

	.banner {
		margin: 0 0 var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--coral) 15%, var(--surface));
	}

	.hosts {
		margin: 0 0 var(--space-1);
		color: var(--text-muted);
	}

	h1 {
		margin: 0 0 var(--space-4);
		font-size: clamp(1.9rem, 6vw, 2.5rem);
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.facts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-3);
	}

	.facts li {
		display: grid;
		grid-template-columns: 1.5rem 1fr;
		gap: var(--space-2);
		align-items: start;
		line-height: 1.45;
	}

	.facts li > :global(svg) {
		margin-top: 0.05rem;
		color: var(--accent);
	}

	.description {
		margin: 0;
		white-space: pre-line;
		overflow-wrap: anywhere;
		line-height: 1.6;
		font-size: 1.05rem;
	}

	/* The one place to act: a soft, raised block instead of a form-like frame. */
	.join {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-6) var(--space-4);
		border-radius: calc(var(--radius) * 1.5);
		background: var(--surface);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.07);
	}

	@media (min-width: 40rem) {
		.join {
			padding: var(--space-6);
		}
	}

	.join h2 {
		margin: 0;
		font-size: 1.4rem;
	}

	.join p {
		margin: 0;
		line-height: 1.55;
	}

	.yes {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--accent);
	}

	.notice {
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

	.quiet-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0 var(--space-4);
		margin-top: calc(-1 * var(--space-2));
	}

	.withdraw summary {
		list-style: none;
	}

	.withdraw summary::-webkit-details-marker {
		display: none;
	}

	.withdraw[open] {
		flex-basis: 100%;
	}
</style>
