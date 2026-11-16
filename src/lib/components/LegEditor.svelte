<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { TravelDirection } from '#lib/forms.js';
	import {
		FORM_MODES,
		MAX_PICKUPS,
		type LegInput,
		type PlaceChoice,
		type TravelMode
	} from '#lib/registration.js';
	import AddressSearch from './AddressSearch.svelte';

	type SavedPlace = { id: string; label: string; area: string };

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
		near: { lat: number; lon: number } | null;
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

	const savedById = (id: string | undefined) => savedPlaces.find((p) => p.id === id);
	const unusedSaved = $derived(
		savedPlaces.filter((sp) => !leg.pickups.some((p) => p.savedId === sp.id))
	);

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

				{#if leg.place?.kind === 'custom'}
					<div class={savedPlaces.length ? 'subcard stack-sm' : 'stack-sm'}>
						<AddressSearch
							id="place-{direction}"
							bind:value={leg.place.point}
							hiddenInputs={false}
						/>
						<label class="field">
							<span>{m.place_label()} <span class="muted">({m.optional()})</span></span>
							<input
								bind:value={leg.place.label}
								maxlength="40"
								placeholder={m.travel_place_label_placeholder()}
							/>
						</label>
						{#if savedPlaces.length < 10}
							<label class="check">
								<input type="checkbox" bind:checked={leg.place.save} />
								{m.travel_place_save()}
							</label>
						{/if}
					</div>
				{/if}

				<!-- When: the day is prefilled from the event, the time is optional -->
				<div class="when">
					<label class="field">
						<span>{isTo ? m.travel_time_to() : m.travel_time_from()}</span>
						<input type="date" bind:value={() => day, (v) => setWhen(v, clock)} />
					</label>
					<label class="field">
						<span>{m.event_time()} <span class="muted">({m.optional()})</span></span>
						<input type="time" disabled={!day} bind:value={() => clock, (v) => setWhen(day, v)} />
					</label>
				</div>

				<label class="field">
					<span>{m.car_note()} <span class="muted">({m.optional()})</span></span>
					<input bind:value={leg.carNote} maxlength="200" placeholder={m.car_note_placeholder()} />
				</label>
			{:else}
				<p class="muted small">{m.car_status_hint()}</p>
			{/if}
		</div>
	{:else if looking}
		<div class="details">
			<label class="field day">
				<span>{m.travel_day()}</span>
				<input type="date" bind:value={() => day, (v) => setWhen(v, '')} />
			</label>

			<div class="pickups">
				<p class="label">{isTo ? m.pickup_where_to() : m.pickup_where_from()}</p>
				<p class="muted small">{m.pickup_where_hint()}</p>
				{#each leg.pickups as pickup, i (pickup)}
					<div class="point">
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
						<input
							type="time"
							class="point-time"
							aria-label={`${m.event_time()} (${m.optional()})`}
							title={isTo ? m.pickup_time_to() : m.pickup_time_from()}
							disabled={!day}
							bind:value={() => pickupClock(pickup.time), (v) => (pickup.time = join(day, v))}
						/>
						<button
							type="button"
							class="icon-btn"
							aria-label={m.remove()}
							title={m.remove()}
							onclick={() => leg.pickups.splice(i, 1)}>✕</button
						>
					</div>
				{/each}
				{#if leg.pickups.length < MAX_PICKUPS}
					<div class="adds">
						{#each unusedSaved as sp (sp.id)}
							<button
								type="button"
								class="btn small"
								onclick={() => leg.pickups.push({ point: null, savedId: sp.id, time: '' })}
								>+ {sp.label}</button
							>
						{/each}
						<button
							type="button"
							class="btn small"
							onclick={() => leg.pickups.push({ point: null, time: '' })}
							>+ {m.pickup_add_search()}</button
						>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</fieldset>

<style>
	.when {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: var(--space-2);
		align-items: end;
	}

	.when input {
		width: 100%;
		min-width: 0;
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
		grid-template-columns: 2rem minmax(0, 1fr) 6.5rem auto;
		gap: var(--space-2);
		align-items: center;
	}

	.or {
		text-align: right;
	}

	.saved {
		display: flex;
		align-items: center;
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

	.adds {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.day input {
		max-width: 14rem;
	}

	/* phones: the place gets the full width, time and remove go below */
	@media (max-width: 30rem) {
		.point {
			grid-template-columns: 6.5rem 1fr auto;
			grid-template-areas:
				'place place place'
				'time . remove';
			padding-bottom: var(--space-2);
			border-bottom: 1px dashed var(--border);
		}

		.or {
			display: none;
		}

		.point-place {
			grid-area: place;
		}

		.point-time {
			grid-area: time;
		}

		.point .icon-btn {
			grid-area: remove;
		}
	}

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch);
	}

	.check input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--accent);
	}
</style>
