<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { carStatusLabel } from '#lib/travel-summary.js';
	import LegLine from '#lib/components/LegLine.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#if data.overview.length === 0}
	<p class="card muted">{m.orga_rides_no_travel_field()}</p>
{/if}

<div class="stack-lg">
	{#each data.overview as o (o.direction)}
		<section class="stack">
			<h2>{o.direction === 'to' ? m.travel_to() : m.travel_from()}</h2>
			<p class="stats">
				<span
					>🚗 {m.orga_rides_drivers({ count: o.counts.drivers, offering: o.counts.offering })}</span
				>
				<span
					>🙋 {m.orga_rides_seekers({ count: o.counts.seekers, assigned: o.counts.assigned })}</span
				>
				{#if o.counts.transitOnly}<span
						>🚆 {m.orga_rides_transit({ count: o.counts.transitOnly })}</span
					>{/if}
			</p>

			{#if o.openSeekers.length}
				<div class="card stack">
					<h3>{m.orga_rides_open({ count: o.openSeekers.length })}</h3>
					<ul class="plain">
						{#each o.openSeekers as s (s.registrationId)}
							<li class="stack-sm">
								<span><strong>{s.name}</strong></span>
								<span class="small"
									><LegLine leg={s.leg} direction={o.direction} timezone={data.timezone} /></span
								>
								{#if s.options.length}
									<form method="post" action="?/assign" use:enhance class="assign">
										<input type="hidden" name="direction" value={o.direction} />
										<input type="hidden" name="passenger" value={s.registrationId} />
										<select name="driver" aria-label={m.orga_rides_assign_to({ name: s.name })}>
											{#each s.options as d (d.registrationId)}
												<option value={d.registrationId}>
													{d.name}{d.detourMin !== null
														? ` · +${d.detourMin} min`
														: ''}{d.carStatus !== 'offering'
														? ` · ${carStatusLabel(d.carStatus ?? 'offering')}`
														: ''}
												</option>
											{/each}
										</select>
										<button class="btn small">{m.orga_rides_assign()}</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="card stack">
				<h3>{m.rides_drivers()}</h3>
				{#if o.drivers.length}
					<ul class="plain">
						{#each o.drivers as d (d.registrationId)}
							<li class="stack-sm">
								<span>
									<strong>{d.name}</strong>
									<span class="small muted">· {carStatusLabel(d.leg.carStatus ?? 'offering')}</span>
								</span>
								<span class="small"
									><LegLine leg={d.leg} direction={o.direction} timezone={data.timezone} /></span
								>
								{#if d.passengers.length}
									<ul class="passengers">
										{#each d.passengers as p (p.linkId)}
											<li>
												<span>{p.name}</span>
												<form method="post" action="?/unlink" use:enhance>
													<input type="hidden" name="link" value={p.linkId} />
													<button class="unlink small">{m.rides_unlink()}</button>
												</form>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted">{m.rides_no_drivers()}</p>
				{/if}
			</div>

			{#if o.undecided.length}
				<p class="small muted">{m.orga_rides_undecided({ names: o.undecided.join(', ') })}</p>
			{/if}
		</section>
	{/each}

	<p class="small">
		<a href={resolve('/e/[slug]/rides', { slug: data.slug })}>{m.orga_rides_participant_view()}</a>
	</p>
</div>

<style>
	/* quiet, so it doesn't look like a main action next to the name */
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

	h2,
	h3 {
		margin: 0;
	}

	h3 {
		font-size: 1rem;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: 0;
		font-size: 0.9rem;
	}

	.plain {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.plain > li {
		padding-block: var(--space-3);
		border-bottom: 1px solid var(--border);
	}

	.plain > li:last-child {
		border-bottom: 0;
	}

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.assign {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}

	.assign select {
		flex: 1;
		min-width: 0;
	}

	.passengers {
		list-style: none;
		margin: var(--space-1) 0 0;
		padding: 0 0 0 var(--space-3);
		border-left: 3px solid var(--accent-soft);
	}

	.passengers li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-2);
		padding-block: var(--space-1);
	}
</style>
