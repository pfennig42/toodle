<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { carStatusLabel } from '#lib/travel-summary.js';
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import LegLine from '#lib/components/LegLine.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const ev = $derived(data.event);
	const v = $derived(data.allowed ? data.view : null);
	const dir = $derived(data.allowed ? data.direction : 'to');
	const myId = $derived(data.allowed ? data.myRegistrationId : null);

	function detourText(match: { detourMin: number; via: string | null } | null) {
		if (!match) return null;
		const base =
			match.detourMin <= 1 ? m.rides_on_the_way() : m.rides_detour({ min: match.detourMin });
		return match.via ? `${base} · ${m.rides_via({ place: match.via })}` : base;
	}

	function timeText(match: { timeGapMin: number | null } | null) {
		if (!match || match.timeGapMin === null) return null;
		const gap = match.timeGapMin;
		if (Math.abs(gap) <= 15) return { text: m.rides_time_fits(), ok: true };
		if (Math.abs(gap) <= 45)
			return {
				text: gap > 0 ? m.rides_time_later({ min: gap }) : m.rides_time_earlier({ min: -gap }),
				ok: true
			};
		const h = Math.round(Math.abs(gap) / 60);
		return {
			text:
				Math.abs(gap) < 90
					? gap > 0
						? m.rides_time_later({ min: gap })
						: m.rides_time_earlier({ min: -gap })
					: gap > 0
						? m.rides_time_later_h({ h })
						: m.rides_time_earlier_h({ h }),
			ok: false
		};
	}
</script>

<svelte:head>
	<title>{m.rides_title()} · {ev.title} · {m.app_name()}</title>
</svelte:head>

<p class="back">
	<a href={resolve('/e/[slug]', { slug: ev.slug })}>← {ev.title}</a>
</p>
<h1>{m.rides_title()}</h1>

{#if !data.allowed}
	<section class="card stack">
		<p>{m.rides_not_registered()}</p>
		<a class="btn btn-primary align-start" href={resolve('/e/[slug]', { slug: ev.slug })}
			>{m.rides_go_register()}</a
		>
	</section>
{:else if !v}
	<p class="card muted">{m.rides_no_location()}</p>
{:else}
	{#if data.directions.length > 1}
		<nav class="segmented dir-switch" aria-label={m.rides_direction()}>
			{#each data.directions as d (d)}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- same page, query only -->
				<a
					href="?dir={d}"
					aria-current={d === dir ? 'page' : undefined}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
				>
					{d === 'to' ? m.travel_to() : m.travel_from()}
					<span class="count"
						>{m.rides_counts({
							drivers: data.counts[d].drivers,
							seekers: data.counts[d].seekers
						})}</span
					>
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/each}
		</nav>
	{/if}

	{#if data.isOrganizer && data.eventVisibility !== 'public'}
		<p class="card note small">
			{data.eventVisibility === 'matched'
				? m.rides_orga_note_matched()
				: m.rides_orga_note_internal()}
		</p>
	{:else if data.visibility === 'matched'}
		<p class="card note small">{m.rides_matched_note()}</p>
	{/if}

	<!-- My own trip -->
	{#if data.registered}
		<section class="card stack mine">
			<h2>{m.rides_you()}</h2>
			{#if v.myLeg}
				<p><LegLine leg={v.myLeg} direction={dir} timezone={ev.timezone} /></p>
			{:else}
				<p class="muted">{m.rides_no_leg()}</p>
			{/if}

			{#if v.role === 'driver' && v.myLeg}
				<form method="post" action="?/carStatus" use:enhance class="segmented status-switch">
					<input type="hidden" name="direction" value={dir} />
					{#each ['offering', 'full'] as const as s (s)}
						<button
							name="status"
							value={s}
							aria-pressed={(v.myLeg.carStatus === 'offering') === (s === 'offering')}
							>{carStatusLabel(s)}</button
						>
					{/each}
				</form>
			{/if}

			{#if v.myDriver}
				{@const link = data.links.find(
					(l) =>
						l.driverRegistrationId === v.myDriver?.registrationId &&
						l.passengerRegistrationId === myId
				)}
				<div class="highlight stack-sm">
					<p><strong>{m.rides_you_ride_with({ name: v.myDriver.name })}</strong></p>
					{#if v.myDriver.contacts.length}<p class="small">{m.rides_contact_hint()}</p>{/if}
					<ContactButtons contacts={v.myDriver.contacts} />
					{#if link}
						<!-- quiet: undoing the ride must not look like the contact buttons -->
						<form method="post" action="?/unlink" use:enhance>
							<input type="hidden" name="link" value={link.id} />
							<button class="unlink small">{m.rides_unlink_passenger()}</button>
						</form>
					{/if}
				</div>
			{/if}

			{#if v.myPassengers.length}
				<div class="highlight stack-sm">
					<p><strong>{m.rides_your_passengers()}</strong></p>
					<ul class="plain">
						{#each v.myPassengers as p (p.registrationId)}
							{@const link = data.links.find(
								(l) =>
									l.passengerRegistrationId === p.registrationId && l.driverRegistrationId === myId
							)}
							<li class="stack-sm">
								<span>{p.name}</span>
								<ContactButtons contacts={p.contacts} />
								{#if link}
									<form method="post" action="?/unlink" use:enhance>
										<input type="hidden" name="link" value={link.id} />
										<button class="unlink small">{m.rides_unlink_driver()}</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<a class="small" href="{resolve('/e/[slug]', { slug: ev.slug })}#registration"
				>{m.rides_change_my_trip()}</a
			>
		</section>
	{/if}

	<!-- Seekers on my route (drivers) -->
	{#snippet seekerList(title: string, hint: string | null)}
		<section class="stack">
			<h2>{title}</h2>
			{#if hint}<p class="muted small">{hint}</p>{/if}
			{#if v && v.seekers.length}
				<ul class="cards">
					{#each v.seekers as s (s.registrationId)}
						{@const time = timeText(s.match)}
						<li class="card ride" class:taken={!!s.driver}>
							<div class="head">
								<strong>{s.name}</strong>
								{#if s.match}<span class="badge" class:good={s.match.detourMin <= 20}
										>{detourText(s.match)}</span
									>{:else if s.distanceKm !== null}<span class="badge"
										>{m.rides_km_away({ km: s.distanceKm })}</span
									>{/if}
							</div>
							<p class="small"><LegLine leg={s.leg} direction={dir} timezone={ev.timezone} /></p>
							{#if time}<p class="small" class:warn={!time.ok}>{time.text}</p>{/if}
							{#if s.driver}
								<p class="small muted">✓ {m.rides_rides_with({ name: s.driver.name })}</p>
							{/if}
							<ContactButtons contacts={s.contacts} />
							{#if (v.role === 'driver' || v.role === 'flexible') && !s.driver}
								<form method="post" action="?/link" use:enhance>
									<input type="hidden" name="direction" value={dir} />
									<input type="hidden" name="driver" value={myId} />
									<input type="hidden" name="passenger" value={s.registrationId} />
									<button class="btn small btn-primary">{m.rides_i_take({ name: s.name })}</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted">
					{data.visibility === 'matched' ? m.rides_no_matching_seekers() : m.rides_no_seekers()}
				</p>
			{/if}
		</section>
	{/snippet}

	{#snippet driverList()}
		<section class="stack">
			<h2>{m.rides_drivers()}</h2>
			{#if v && v.drivers.length}
				<ul class="cards">
					{#each v.drivers as d (d.registrationId)}
						{@const time = timeText(d.match)}
						{@const offering = d.leg.carStatus === 'offering'}
						<li class="card ride" class:inactive={!offering}>
							<div class="head">
								<strong>{d.name}</strong>
								{#if d.match}<span class="badge" class:good={d.match.detourMin <= 20}
										>{detourText(d.match)}</span
									>{/if}
							</div>
							<p class="small"><LegLine leg={d.leg} direction={dir} timezone={ev.timezone} /></p>
							{#if time}<p class="small" class:warn={!time.ok}>{time.text}</p>{/if}
							<p class="small">
								<span class="status status-{d.leg.carStatus}"
									>{carStatusLabel(d.leg.carStatus ?? 'offering')}</span
								>
								{#if d.leg.carNote}<span class="muted"> – {d.leg.carNote}</span>{/if}
							</p>
							{#if d.passengers.length}
								<p class="small muted">
									{m.rides_takes({ names: d.passengers.map((p) => p.name).join(', ') })}
								</p>
							{/if}
							<ContactButtons contacts={d.contacts} />
							{#if v.role !== 'driver' && data.registered && offering && !v.myDriver}
								<form method="post" action="?/link" use:enhance>
									<input type="hidden" name="direction" value={dir} />
									<input type="hidden" name="driver" value={d.registrationId} />
									<input type="hidden" name="passenger" value={myId} />
									<button class="btn small btn-primary"
										>{m.rides_i_ride_with({ name: d.name })}</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted">
					{data.visibility === 'matched' ? m.rides_no_matching_drivers() : m.rides_no_drivers()}
				</p>
			{/if}
		</section>
	{/snippet}

	{#if data.visibility === 'internal'}
		<p class="card note">{m.rides_internal_note()}</p>
	{:else if data.visibility === 'matched' && v.role === 'other'}
		<p class="card note">{m.rides_matched_no_leg()}</p>
	{:else if v.role === 'flexible'}
		<!-- drives or rides along: both lists, whatever fits better -->
		<p class="muted small">{m.rides_flexible_hint()}</p>
		{@render driverList()}
		{@render seekerList(m.rides_seekers_on_route(), m.rides_seekers_hint())}
	{:else if v.role === 'driver'}
		{@render seekerList(m.rides_seekers_on_route(), m.rides_seekers_hint())}
		{#if v.drivers.length}
			<details class="more">
				<summary>{m.rides_other_drivers({ count: v.drivers.length })}</summary>
				{@render driverList()}
			</details>
		{/if}
	{:else}
		{@render driverList()}
		{#if v.seekers.length}
			<details class="more">
				<summary>{m.rides_other_seekers({ count: v.seekers.length })}</summary>
				{@render seekerList(
					m.rides_seekers_all(),
					v.role === 'seeker' ? m.rides_seekers_together() : null
				)}
			</details>
		{/if}
	{/if}

	{#if data.visibility === 'matched' && v.role !== 'other' && v.hidden.drivers + v.hidden.seekers > 0}
		<p class="muted small hidden-count">
			{m.rides_hidden({ count: v.hidden.drivers + v.hidden.seekers })}
		</p>
	{/if}

	<p class="muted small privacy">{m.rides_privacy()}</p>
{/if}

<style>
	.back {
		margin: 0 0 var(--space-2);
	}

	.back a {
		color: var(--text-muted);
		text-decoration: none;
	}

	.dir-switch {
		margin-bottom: var(--space-3);
	}

	.dir-switch a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 3.25rem;
		padding: var(--space-1) var(--space-2);
		color: var(--text);
		text-decoration: none;
		background: var(--surface);
	}

	.dir-switch a + a {
		border-left: 1px solid var(--border);
	}

	.dir-switch a[aria-current='page'] {
		background: var(--accent-soft);
		font-weight: 600;
	}

	.count {
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--text-muted);
	}

	.privacy {
		margin-top: var(--space-6);
	}

	.hidden-count {
		margin-top: var(--space-4);
	}

	.note {
		margin: 0 0 var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--surface-2);
		border-color: transparent;
	}

	section + section,
	.more {
		margin-top: var(--space-6);
	}

	h2 {
		margin: 0;
	}

	.mine p {
		margin: 0;
	}

	.highlight {
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--accent-soft);
	}

	.highlight p {
		margin: 0;
	}

	/* undoing a ride: a quiet text button, apart from the contact buttons */
	.unlink {
		min-height: var(--touch);
		padding: 0;
		border: 0;
		background: none;
		color: var(--text-muted);
		font: inherit;
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.unlink:hover {
		color: var(--danger);
	}

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.plain {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.ride {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
	}

	.ride p {
		margin: 0;
	}

	.ride.inactive,
	.ride.taken {
		opacity: 0.7;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.badge {
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		font-size: 0.8rem;
		background: var(--surface-2);
		color: var(--text-muted);
		text-align: right;
	}

	.badge.good {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 600;
	}

	.warn {
		color: var(--coral);
	}

	.status {
		font-weight: 600;
	}

	.status-offering {
		color: var(--accent);
	}

	.status-full,
	.status-not_offering {
		color: var(--text-muted);
	}

	.status-switch {
		flex-wrap: wrap;
	}

	.status-switch button {
		flex: 1 1 8.5rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: -1px;
	}

	.status-switch button[aria-pressed='true'] {
		background: var(--accent-soft);
		font-weight: 600;
	}

	.more summary {
		cursor: pointer;
		font-weight: 600;
		min-height: var(--touch);
		display: flex;
		align-items: center;
	}

	.align-start {
		align-self: flex-start;
	}
</style>
