<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { TravelDirection } from '#lib/forms.js';
	import {
		FORM_MODES,
		MAX_PICKUPS,
		type LegInput,
		type GeoPoint,
		type PlaceChoice,
		type TravelMode
	} from '#lib/registration.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatShortDate } from '#lib/date-range.js';
	import AddressSearch from './AddressSearch.svelte';
	import Icon from './Icon.svelte';
	import LegMap from './LegMap.svelte';

	type SavedPlace = { id: string; label: string; area: string; lat?: number; lon?: number };

	let {
		leg = $bindable(),
		direction,
		savedPlaces,
		near,
		error = null
	}: {
		leg: LegInput;
		direction: TravelDirection;
		savedPlaces: SavedPlace[];
		near: { lat: number; lon: number; label?: string } | null;
		error?: string | null;
	} = $props();

	const modeLabel: Record<TravelMode, () => string> = {
		car: m.mode_car,
		transit: m.mode_transit,
		seeking: m.mode_seeking,
		undecided: m.mode_undecided
	};
	const modeIcon: Record<TravelMode, string> = {
		car: '🚗',
		transit: '🚆',
		seeking: '🙋',
		undecided: '🤷'
	};

	const isTo = $derived(direction === 'to');
	// "transit" is only shown for older registrations that still use it
	const modes = $derived(
		leg.mode === 'transit' ? ([...FORM_MODES, 'transit'] as TravelMode[]) : [...FORM_MODES]
	);
	const looking = $derived(leg.mode === 'seeking' || leg.mode === 'transit');

	/** Someone driving with free seats needs a start: the saved place, or the search. */
	function ensurePlace() {
		if (leg.place) return;
		leg.place = savedPlaces[0]
			? { kind: 'saved', id: savedPlaces[0].id }
			: { kind: 'custom', label: m.place_default_home(), point: null, save: true };
	}

	function setMode(mode: TravelMode) {
		leg.mode = mode;
		if (mode === 'car' && leg.carStatus === 'offering') ensurePlace();
		// looking for a ride: start with the saved place (e.g. home) or an empty search
		if (mode === 'seeking' && leg.pickups.length === 0) {
			leg.pickups.push(
				savedPlaces[0]
					? { point: null, savedId: savedPlaces[0].id, time: '' }
					: { point: null, time: '' }
			);
		}
	}

	const placeSelect = $derived(
		leg.place?.kind === 'saved' ? leg.place.id : leg.place?.kind === 'custom' ? '__custom' : ''
	);
	// A custom place typed in is kept when switching to a saved place and back.
	let stash: Extract<PlaceChoice, { kind: 'custom' }> | null = null;

	function choosePlace(value: string) {
		if (leg.place?.kind === 'custom') stash = $state.snapshot(leg.place);
		if (value === '__custom') {
			leg.place = stash ?? { kind: 'custom', label: '', point: null, save: true };
		} else {
			leg.place = value ? { kind: 'saved', id: value } : null;
		}
	}

	/** "2027-07-16T14:00" ↔ day + optional time (just the day is fine) */
	const day = $derived(leg.time.slice(0, 10));
	const clock = $derived(leg.time.length > 10 ? leg.time.slice(11, 16) : '');
	const join = (d: string, c: string) => (d ? (c ? `${d}T${c}` : d) : '');
	function setWhen(nextDay: string, nextClock: string) {
		leg.time = join(nextDay, nextClock);
		// pick-up times are times on that day
		for (const p of leg.pickups) if (p.time) p.time = join(nextDay, p.time.slice(11, 16));
	}
	const pickupClock = (time: string) => (time.length > 10 ? time.slice(11, 16) : '');

	/*
	 * Only what everybody answers is open; the rest waits behind "+ …" (docs/konzept.md 4.4).
	 * Extras already filled in start open. The day is prefilled from the event – shown as text.
	 */
	const locale = getLocale();
	let editDay = $state(false);
	let showClock = $state(leg.time.length > 10);
	let showNote = $state(!!leg.carNote);
	let showPickupTimes = $state(leg.pickups.some((p) => !!p.time));

	function reveal(set: () => void, id: string) {
		set();
		requestAnimationFrame(() => document.getElementById(id)?.focus());
	}

	const savedById = (id: string | undefined) => savedPlaces.find((p) => p.id === id);
	const unusedSaved = $derived(
		savedPlaces.filter((sp) => !leg.pickups.some((p) => p.savedId === sp.id))
	);

	/* The map: the event and the places chosen so far. A click there adds a place too. */
	type Spot = { lat: number; lon: number; label: string };
	const spotOf = (point: GeoPoint | null, savedId?: string): Spot | null => {
		if (point) return { lat: point.lat, lon: point.lon, label: point.name || point.address };
		const sp = savedById(savedId);
		return sp?.lat != null && sp.lon != null ? { lat: sp.lat, lon: sp.lon, label: sp.label } : null;
	};
	const venue = $derived(near ? { lat: near.lat, lon: near.lon, label: near.label ?? '' } : null);
	const spots = $derived(
		(looking
			? leg.pickups.map((p) => spotOf(p.point, p.savedId))
			: leg.place?.kind === 'custom'
				? [spotOf(leg.place.point)]
				: leg.place?.kind === 'saved'
					? [spotOf(null, leg.place.id)]
					: []
		).filter((s): s is Spot => !!s)
	);
	const pickupsFull = $derived(
		leg.pickups.length >= MAX_PICKUPS && leg.pickups.every((p) => p.point || p.savedId)
	);

	function pickOnMap(point: GeoPoint) {
		if (!looking) {
			const label = leg.place?.kind === 'custom' ? leg.place.label : (stash?.label ?? '');
			leg.place = { kind: 'custom', label, point, save: true };
			return;
		}
		// an empty search is filled first, otherwise one more place
		const empty = leg.pickups.find((p) => !p.point && !p.savedId);
		if (empty) empty.point = point;
		else if (leg.pickups.length < MAX_PICKUPS) leg.pickups.push({ point, time: '' });
	}

	// Server errors are hidden as soon as the problem is fixed in the form.
	const placeOk = $derived(
		leg.place?.kind === 'saved' || (leg.place?.kind === 'custom' && !!leg.place.point)
	);
	const pickupsOk = $derived(
		leg.pickups.length > 0 && leg.pickups.every((p) => !!p.point || !!p.savedId)
	);
	const visibleError = $derived(
		(error === 'required' && leg.mode) ||
			(error === 'place' && placeOk) ||
			(error === 'pickup' && pickupsOk)
			? null
			: error
	);

	const errorText = $derived(
		visibleError === 'required'
			? m.travel_error_required()
			: visibleError === 'place'
				? m.travel_error_place()
				: visibleError === 'pickup'
					? m.travel_error_pickup()
					: visibleError
						? m.travel_error_invalid()
						: null
	);
</script>

<!-- The day comes prefilled from the event: a line of text – a date field only on request. -->
{#snippet dayLine()}
	{#if editDay || !day}
		<label class="field day">
			<span>{m.travel_day()}</span>
			<input
				id="day-{direction}"
				type="date"
				bind:value={() => day, (v) => setWhen(v, leg.mode === 'car' ? clock : '')}
			/>
		</label>
	{:else}
		<p class="day-line">
			<span class="day-text"><Icon name="calendar" size={18} />{formatShortDate(day, locale)}</span>
			<button
				type="button"
				class="more"
				aria-label={m.travel_change_day()}
				onclick={() => reveal(() => (editDay = true), `day-${direction}`)}
				>{m.travel_change()}</button
			>
		</p>
	{/if}
{/snippet}

{#snippet mapBox(hint: string, canPick = true)}
	{#if venue || spots.length}
		<LegMap event={venue} {spots} onpick={pickOnMap} {hint} {canPick} />
	{/if}
{/snippet}

<fieldset class="leg" aria-describedby={errorText ? `leg-error-${direction}` : undefined}>
	<legend>{isTo ? m.travel_to() : m.travel_from()}</legend>

	<div class="modes" role="radiogroup" aria-label={m.travel_how()}>
		{#each modes as mode (mode)}
			<button
				type="button"
				role="radio"
				aria-checked={leg.mode === mode}
				class="mode"
				onclick={() => setMode(mode)}
			>
				<span aria-hidden="true">{modeIcon[mode]}</span>
				{modeLabel[mode]()}
			</button>
		{/each}
	</div>

	{#if errorText}<p class="error small" id="leg-error-{direction}">{errorText}</p>{/if}

	{#if leg.mode === 'car'}
		<div class="details">
			<!-- first: can anyone come along? Only then where from and when matter -->
			<div class="field">
				<span class="label">{m.car_status_label()}</span>
				<div class="segmented wrap" role="radiogroup" aria-label={m.car_status_label()}>
					{#each [true, false] as room (room)}
						<button
							type="button"
							role="radio"
							aria-checked={(leg.carStatus === 'offering') === room}
							onclick={() => {
								leg.carStatus = room ? 'offering' : 'full';
								if (room) ensurePlace();
							}}
						>
							{room ? m.yes() : m.no()}
						</button>
					{/each}
				</div>
			</div>

			{#if leg.carStatus === 'offering'}
				{#if savedPlaces.length}
					<label class="field">
						<span>{isTo ? m.travel_place_to() : m.travel_place_from()}</span>
						<select value={placeSelect} onchange={(e) => choosePlace(e.currentTarget.value)}>
							<option value="">{m.travel_place_choose()}</option>
							{#each savedPlaces as p (p.id)}
								<option value={p.id}>{p.label} ({p.area})</option>
							{/each}
							<option value="__custom">{m.travel_place_other()}</option>
						</select>
					</label>
				{:else}
					<!-- nothing saved yet: no list to choose from, just search -->
					<label class="field-label" for="place-{direction}"
						>{isTo ? m.travel_place_to() : m.travel_place_from()}</label
					>
				{/if}

				<!-- No name, no "save" checkbox: the first place is kept as "Zuhause" in the profile
				     (renamed there if need be), other places only belong to this trip. -->
				{#if leg.place?.kind === 'custom'}
					<AddressSearch id="place-{direction}" bind:value={leg.place.point} hiddenInputs={false} />
				{/if}
				{@render mapBox(m.map_hint_start())}

				{@render dayLine()}
				{#if showClock}
					<label class="field clock">
						<span>{isTo ? m.travel_time_to() : m.travel_time_from()}</span>
						<input
							id="clock-{direction}"
							type="time"
							disabled={!day}
							bind:value={() => clock, (v) => setWhen(day, v)}
						/>
					</label>
				{/if}
				{#if showNote}
					<label class="field">
						<span>{m.car_note()} <span class="muted">({m.optional()})</span></span>
						<input
							id="note-{direction}"
							bind:value={leg.carNote}
							maxlength="200"
							placeholder={m.car_note_placeholder()}
						/>
					</label>
				{/if}
				{#if !showClock || !showNote}
					<div class="extras">
						{#if !showClock}
							<button
								type="button"
								class="more"
								onclick={() => reveal(() => (showClock = true), `clock-${direction}`)}
								>{m.event_add_time()}</button
							>
						{/if}
						{#if !showNote}
							<button
								type="button"
								class="more"
								onclick={() => reveal(() => (showNote = true), `note-${direction}`)}
								>{m.travel_add_note()}</button
							>
						{/if}
					</div>
				{/if}
			{:else}
				<p class="muted small">{m.car_status_hint()}</p>
			{/if}
		</div>
	{:else if looking}
		<div class="details">
			<div class="pickups">
				<p class="label">{isTo ? m.pickup_where_to() : m.pickup_where_from()}</p>
				{#each leg.pickups as pickup, i (pickup)}
					<div class="point" class:with-time={showPickupTimes}>
						<span class="small muted or">{i === 0 ? '' : m.summary_or()}</span>
						<div class="point-place">
							{#if pickup.savedId}
								<span class="saved"
									>📍 {savedById(pickup.savedId)?.label}&nbsp;<span class="muted"
										>({savedById(pickup.savedId)?.area})</span
									></span
								>
							{:else}
								<AddressSearch
									id="pickup-{direction}-{i}"
									bind:value={pickup.point}
									{near}
									hiddenInputs={false}
									showArea={false}
									compact
									placeholder={m.pickup_search_placeholder()}
								/>
							{/if}
						</div>
						{#if showPickupTimes}
							<input
								type="time"
								id="pickup-time-{direction}-{i}"
								class="point-time"
								aria-label={`${isTo ? m.pickup_time_to() : m.pickup_time_from()} (${m.optional()})`}
								title={isTo ? m.pickup_time_to() : m.pickup_time_from()}
								disabled={!day}
								bind:value={() => pickupClock(pickup.time), (v) => (pickup.time = join(day, v))}
							/>
						{/if}
						{#if leg.pickups.length > 1}
							<button
								type="button"
								class="icon-btn"
								aria-label={m.remove()}
								title={m.remove()}
								onclick={() => leg.pickups.splice(i, 1)}>✕</button
							>
						{/if}
					</div>
				{/each}
				{#if leg.pickups.length < MAX_PICKUPS}
					<div class="extras">
						{#each unusedSaved as sp (sp.id)}
							<button
								type="button"
								class="more"
								onclick={() => leg.pickups.push({ point: null, savedId: sp.id, time: '' })}
								>+ {sp.label}</button
							>
						{/each}
						<button
							type="button"
							class="more"
							onclick={() =>
								reveal(
									() => leg.pickups.push({ point: null, time: '' }),
									`pickup-${direction}-${leg.pickups.length}`
								)}>+ {leg.pickups.length ? m.pickup_add_more() : m.pickup_add_search()}</button
						>
					</div>
				{/if}
				{@render mapBox(pickupsFull ? m.map_full() : m.map_hint_pickup(), !pickupsFull)}
			</div>

			{@render dayLine()}
			{#if !showPickupTimes}
				<div class="extras">
					<button
						type="button"
						class="more"
						onclick={() => reveal(() => (showPickupTimes = true), `pickup-time-${direction}-0`)}
						>{m.pickup_add_times()}</button
					>
				</div>
			{/if}
		</div>
	{/if}
</fieldset>

<style>
	/* quiet extras: "+ Uhrzeit", "+ Notiz", "ändern" */
	.extras {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--space-4);
		margin-top: calc(-1 * var(--space-2));
	}

	.more {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.day-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 var(--space-3);
		margin: 0;
	}

	.day-text {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.day-text :global(svg) {
		color: var(--text-muted);
	}

	.clock input {
		max-width: 10rem;
	}

	.field-label {
		font-weight: 500;
		margin-bottom: calc(-1 * var(--space-2));
	}

	.leg {
		gap: var(--space-3);
	}

	legend {
		font-size: 1.05rem;
	}

	/* three choices side by side, also on phones */
	.modes {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		gap: var(--space-2);
	}

	.mode {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 3.5rem;
		padding: var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		cursor: pointer;
		font-size: 0.9rem;
		text-align: center;
	}

	.mode span {
		font-size: 1.3rem;
		line-height: 1;
	}

	.mode[aria-checked='true'] {
		border-color: var(--accent);
		background: var(--accent-soft);
		font-weight: 600;
		box-shadow: inset 0 0 0 1px var(--accent);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-left: var(--space-3);
		border-left: 3px solid var(--accent-soft);
	}

	.label {
		font-weight: 500;
		margin: 0;
	}

	.segmented.wrap {
		flex-wrap: wrap;
	}

	.segmented.wrap button {
		flex: 1 1 8rem;
	}

	.segmented button[aria-checked='true'] {
		background: var(--accent-soft);
		font-weight: 600;
	}

	.pickups {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.pickups p {
		margin: 0;
	}

	.point {
		display: grid;
		grid-template-columns: 2rem minmax(0, 1fr) auto;
		gap: var(--space-2);
		align-items: center;
	}

	.point.with-time {
		grid-template-columns: 2rem minmax(0, 1fr) 6.5rem auto;
	}

	.or {
		text-align: right;
	}

	.saved {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		align-content: center;
		column-gap: 0.3em;
		min-height: var(--touch);
		padding: 0 var(--space-3);
		border-radius: var(--radius);
		background: var(--surface-2);
		overflow-wrap: anywhere;
	}

	.point-time {
		width: 100%;
		min-width: 0;
	}

	.icon-btn {
		min-width: var(--touch);
		min-height: var(--touch);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--text-muted);
		cursor: pointer;
	}

	.icon-btn:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.day input {
		max-width: 14rem;
	}

	/* phones: the place gets the full width, time and remove go below */
	@media (max-width: 30rem) {
		.point,
		.point.with-time {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.or {
			display: none;
		}

		.point.with-time {
			grid-template-columns: 6.5rem 1fr auto;
			grid-template-areas:
				'place place place'
				'time . remove';
			padding-bottom: var(--space-2);
			border-bottom: 1px dashed var(--border);
		}

		.with-time .point-place {
			grid-area: place;
		}

		.with-time .point-time {
			grid-area: time;
		}

		.with-time .icon-btn {
			grid-area: remove;
		}
	}
</style>
