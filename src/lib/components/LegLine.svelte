<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { TravelDirection } from '#lib/forms.js';
	import type { TravelMode } from '#lib/registration.js';
	import { MODE_ICON, modeLabel, onlyTime, shortTime } from '#lib/travel-summary.js';

	let {
		leg,
		direction,
		timezone
	}: {
		leg: {
			mode: TravelMode;
			time: Date | null;
			placeArea: string | null;
			pickups: { label: string; time: Date | null }[];
		};
		direction: TravelDirection;
		timezone: string;
	} = $props();

	const locale = getLocale();
</script>

<span class="leg-line">
	<span aria-hidden="true">{MODE_ICON[leg.mode]}</span>
	{#if leg.pickups.length}
		{direction === 'to' ? m.summary_pickup_to() : m.summary_pickup_from()}
		{#each leg.pickups as p, i (i)}
			{#if i > 0}&nbsp;{m.summary_or()}&nbsp;{/if}<span class="nowrap"
				>{p.label}{p.time ? ` ~${onlyTime(p.time, timezone, locale)}` : ''}</span
			>
		{/each}
	{:else}
		{modeLabel(leg.mode)}{#if leg.placeArea}
			&nbsp;· {direction === 'to' ? m.summary_from() : m.summary_to()}
			{leg.placeArea}{/if}{#if leg.time}
			&nbsp;· {shortTime(leg.time, timezone, locale)}{/if}
	{/if}
</span>

<style>
	.nowrap {
		white-space: nowrap;
	}
</style>
