<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { FieldType } from '#lib/forms.js';
	import type { AnswerValue, CarStatus, TravelMode } from '#lib/registration.js';
	import {
		carStatusLabel,
		MODE_ICON,
		modeLabel,
		onlyTime,
		shortTime
	} from '#lib/travel-summary.js';

	type Leg = {
		direction: 'to' | 'from';
		mode: TravelMode;
		time: Date | null;
		hasClock: boolean;
		placeLabel: string | null;
		placeArea: string | null;
		carStatus: CarStatus | null;
		carNote: string;
		pickups: { label: string; area: string; time: Date | null }[];
	};

	let {
		fields,
		answers,
		legs,
		comment,
		timezone
	}: {
		fields: { id: string; type: FieldType; label: string }[];
		answers: Record<string, AnswerValue>;
		legs: Leg[];
		comment: string;
		timezone: string;
	} = $props();

	const locale = getLocale();
	const ordered = $derived(
		(['to', 'from'] as const).map((d) => legs.find((l) => l.direction === d)).filter((l) => !!l)
	);

	function placeText(leg: Leg): string {
		return leg.placeArea && leg.placeArea !== leg.placeLabel
			? `${leg.placeLabel} (${leg.placeArea})`
			: (leg.placeLabel ?? '');
	}

	function formatAnswer(v: AnswerValue): string {
		if (v === true) return m.yes();
		if (v === false) return m.no();
		if (Array.isArray(v)) return v.join(', ');
		return String(v);
	}
</script>

<dl class="summary">
	{#each ordered as leg (leg.direction)}
		<div>
			<dt>{leg.direction === 'to' ? m.travel_to() : m.travel_from()}</dt>
			<dd>
				<strong>{MODE_ICON[leg.mode]} {modeLabel(leg.mode)}</strong>
				{#if leg.placeLabel}
					· {leg.direction === 'to' ? m.summary_from() : m.summary_to()}
					{placeText(leg)}
				{/if}
				{#if leg.time}· {shortTime(leg.time, timezone, locale, leg.hasClock)}{/if}
				{#if leg.carStatus}<br /><span class="muted"
						>{carStatusLabel(leg.carStatus)}{leg.carNote ? ` – ${leg.carNote}` : ''}</span
					>{/if}
				{#if leg.pickups.length}
					<br />
					<span class="muted">
						{leg.direction === 'to' ? m.summary_pickup_to() : m.summary_pickup_from()}
						{#each leg.pickups as p, i (i)}
							{#if i > 0}&nbsp;{m.summary_or()}&nbsp;{/if}<span class="nowrap"
								>{p.label}{p.time ? ` ~${onlyTime(p.time, timezone, locale)}` : ''}</span
							>
						{/each}
					</span>
				{/if}
			</dd>
		</div>
	{/each}
	{#each fields as field (field.id)}
		{#if field.type !== 'travel' && answers[field.id] !== undefined}
			<div>
				<dt>{field.label}</dt>
				<dd>{formatAnswer(answers[field.id])}</dd>
			</div>
		{/if}
	{/each}
	{#if comment}
		<div>
			<dt>{m.registration_comment()}</dt>
			<dd class="pre">{comment}</dd>
		</div>
	{/if}
</dl>

<style>
	.summary {
		display: grid;
		gap: var(--space-3);
		margin: 0;
	}

	dt {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.pre {
		white-space: pre-line;
	}

	.nowrap {
		white-space: nowrap;
	}
</style>
