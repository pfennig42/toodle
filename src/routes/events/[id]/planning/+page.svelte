<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { MODE_ICON, modeLabel, onlyTime } from '#lib/travel-summary.js';
	import type { TravelMode } from '#lib/registration.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const locale = getLocale();

	const dayLabel = (day: string) =>
		new Intl.DateTimeFormat(locale, {
			timeZone: 'UTC',
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(new Date(`${day}T12:00:00Z`));

	const MODES: (TravelMode | 'none')[] = [
		'car',
		'flexible',
		'transit',
		'seeking',
		'undecided',
		'none'
	];
	const modeText = (mode: TravelMode | 'none') =>
		mode === 'none' ? m.planning_mode_none() : `${MODE_ICON[mode]} ${modeLabel(mode)}`;
	const timeText = (t: Date | null) => (t ? onlyTime(t, data.timezone, locale) : '–');
	const hasCounts = (f: (typeof data.summary)[number]) =>
		f.kind === 'number' ? f.answered > 0 : f.counts.some((c) => c.n > 0);
</script>

{#if data.total === 0}
	<p class="card muted">{m.participants_empty()}</p>
{:else}
	<div class="stack-lg">
		<section class="stack">
			<h2>{m.planning_days()}</h2>
			<p class="small muted">{m.planning_days_hint()} {m.planning_no_time_hint()}</p>
			{#each data.days as d (d.day)}
				<article class="card stack day" aria-label={dayLabel(d.day)}>
					<h3>{dayLabel(d.day)}</h3>
					<dl class="numbers">
						<div>
							<dt>{m.planning_present()}</dt>
							<dd>{d.present}</dd>
						</div>
						<div>
							<dt>{m.planning_overnight()}</dt>
							<dd>{d.overnight}</dd>
						</div>
						<div>
							<dt>{m.planning_arriving()}</dt>
							<dd>{d.arriving.length}</dd>
						</div>
						<div>
							<dt>{m.planning_leaving()}</dt>
							<dd>{d.leaving.length}</dd>
						</div>
					</dl>
					{#if d.arriving.length || d.leaving.length}
						<details>
							<summary>{m.planning_who()}</summary>
							<div class="who grid-2">
								{#if d.arriving.length}
									<div>
										<p class="small muted">{m.planning_arriving()}</p>
										<ul class="plain small">
											{#each d.arriving as a, i (i)}
												<li><span class="time">{timeText(a.time)}</span> {a.name}</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if d.leaving.length}
									<div>
										<p class="small muted">{m.planning_leaving()}</p>
										<ul class="plain small">
											{#each d.leaving as a, i (i)}
												<li><span class="time">{timeText(a.time)}</span> {a.name}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</details>
					{/if}
					{#if d.fields.some(hasCounts)}
						<details>
							<summary>{m.planning_day_answers()}</summary>
							<ul class="plain small facts">
								{#each d.fields.filter(hasCounts) as f (f.fieldId)}
									<li>
										<span class="muted">{f.label}:</span>
										{#if f.kind === 'number'}
											{m.planning_sum({ sum: f.sum })}
										{:else}
											{f.counts
												.filter((c) => c.n > 0)
												.map((c) => `${c.n} × ${c.option}`)
												.join(' · ')}
										{/if}
									</li>
								{/each}
							</ul>
						</details>
					{/if}
				</article>
			{/each}
		</section>

		{#if data.summary.length}
			<section class="card stack" aria-labelledby="planning-answers">
				<h2 id="planning-answers">{m.planning_answers()}</h2>
				{#each data.summary as f (f.fieldId)}
					<div>
						<h3>{f.label}</h3>
						{#if f.kind === 'number'}
							<p>
								{m.planning_sum({ sum: f.sum })}
								<span class="small muted">· {m.planning_answered({ count: f.answered })}</span>
							</p>
						{:else}
							<ul class="plain counts">
								{#each f.counts as c (c.option)}
									<li><span>{c.option}</span><strong>{c.n}</strong></li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</section>
		{/if}

		{#if data.mobility.length}
			<section class="card stack" aria-labelledby="planning-mobility">
				<h2 id="planning-mobility">{m.planning_mobility()}</h2>
				{#each data.mobility as mob (mob.direction)}
					<div>
						<h3>{mob.direction === 'to' ? m.travel_to() : m.travel_from()}</h3>
						<ul class="plain counts">
							{#each MODES.filter((x) => mob.counts[x] > 0) as mode (mode)}
								<li><span>{modeText(mode)}</span><strong>{mob.counts[mode]}</strong></li>
							{/each}
						</ul>
					</div>
				{/each}
				<a class="btn small align-start" href={resolve('/events/[id]/rides', { id: data.event.id })}
					>{m.planning_to_rides()}</a
				>
			</section>
		{/if}
	</div>
{/if}

<style>
	h2,
	h3 {
		margin: 0;
	}

	h3 {
		font-size: 1rem;
	}

	.day p {
		margin: 0;
	}

	.numbers {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-3) var(--space-2);
		margin: 0;
	}

	@media (max-width: 30rem) {
		.numbers {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.numbers div {
		display: flex;
		flex-direction: column-reverse;
		justify-content: flex-end;
	}

	.numbers dt {
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.2;
	}

	.numbers dd {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}

	.who {
		margin-top: var(--space-2);
	}

	.time {
		display: inline-block;
		min-width: 3.2em;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.facts {
		display: grid;
		gap: var(--space-1);
		margin-top: var(--space-2);
	}

	.counts {
		display: grid;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}

	.counts li {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
		padding-bottom: var(--space-1);
		border-bottom: 1px dashed var(--border);
	}

	.counts strong {
		font-variant-numeric: tabular-nums;
	}

	summary {
		cursor: pointer;
		min-height: var(--touch);
		display: flex;
		align-items: center;
	}

	.align-start {
		align-self: flex-start;
	}
</style>
