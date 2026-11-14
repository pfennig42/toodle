<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { TravelDirection } from '#lib/forms.js';
	import {
		CAR_STATUSES,
		MAX_PICKUPS,
		TRAVEL_MODES,
		type CarStatus,
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
	const carLabel: Record<CarStatus, () => string> = {
		offering: m.car_offering,
		full: m.car_full,
		not_offering: m.car_not_offering
	};

	const isTo = $derived(direction === 'to');
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

	function addPickup() {
		leg.pickups.push({ point: null, time: '' });
	}

	// Server errors are hidden as soon as the problem is fixed in the form.
	const placeOk = $derived(
		leg.place?.kind === 'saved' || (leg.place?.kind === 'custom' && !!leg.place.point)
	);
	const pickupsOk = $derived(leg.pickups.every((p) => !!p.point));
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
		{#each TRAVEL_MODES as mode (mode)}
			<button
				type="button"
				role="radio"
				aria-checked={leg.mode === mode}
				class="mode"
				onclick={() => (leg.mode = mode)}
			>
				<span aria-hidden="true">{modeIcon[mode]}</span>
				{modeLabel[mode]()}
			</button>
		{/each}
	</div>

	{#if errorText}<p class="error small" id="leg-error-{direction}">{errorText}</p>{/if}

	{#if leg.mode && leg.mode !== 'undecided'}
		<div class="details">
			<!-- Where from / to -->
			<label class="field">
				<span>
					{isTo ? m.travel_place_to() : m.travel_place_from()}
					{#if leg.mode === 'transit'}<span class="muted">({m.optional()})</span>{/if}
				</span>
				<select value={placeSelect} onchange={(e) => choosePlace(e.currentTarget.value)}>
					<option value="">{m.travel_place_choose()}</option>
					{#each savedPlaces as p (p.id)}
						<option value={p.id}>{p.label} ({p.area})</option>
					{/each}
					<option value="__custom">{m.travel_place_other()}</option>
				</select>
			</label>

			{#if leg.place?.kind === 'custom'}
				<div class="subcard stack-sm">
					<AddressSearch id="place-{direction}" bind:value={leg.place.point} hiddenInputs={false} />
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

			<!-- When -->
			<label class="field">
				<span
					>{isTo ? m.travel_time_to() : m.travel_time_from()}
					<span class="muted">({m.optional()})</span></span
				>
				<input type="datetime-local" bind:value={leg.time} />
			</label>

			{#if leg.mode === 'car'}
				<div class="field">
					<span class="label">{m.car_status_label()}</span>
					<div class="segmented wrap" role="radiogroup" aria-label={m.car_status_label()}>
						{#each CAR_STATUSES as status (status)}
							<button
								type="button"
								role="radio"
								aria-checked={leg.carStatus === status}
								onclick={() => (leg.carStatus = status)}
							>
								{carLabel[status]()}
							</button>
						{/each}
					</div>
					<span class="muted small">{m.car_status_hint()}</span>
				</div>
				<label class="field">
					<span>{m.car_note()} <span class="muted">({m.optional()})</span></span>
					<input bind:value={leg.carNote} maxlength="200" placeholder={m.car_note_placeholder()} />
				</label>
			{/if}

			{#if leg.mode === 'transit'}
				<div class="pickups">
					<p class="label">{isTo ? m.pickup_title_to() : m.pickup_title_from()}</p>
					<p class="muted small">{isTo ? m.pickup_hint_to() : m.pickup_hint_from()}</p>
					{#each leg.pickups as pickup, i (pickup)}
						<div class="subcard stack-sm pickup">
							<div class="pickup-head">
								<span class="small muted"
									>{i === 0 ? m.pickup_option_first() : m.pickup_option_or()}</span
								>
								<button type="button" class="btn small" onclick={() => leg.pickups.splice(i, 1)}
									>{m.remove()}</button
								>
							</div>
							<AddressSearch
								id="pickup-{direction}-{i}"
								bind:value={pickup.point}
								{near}
								hiddenInputs={false}
								showArea={false}
								compact
								placeholder={m.pickup_search_placeholder()}
							/>
							<label class="field">
								<span
									>{isTo ? m.pickup_time_to() : m.pickup_time_from()}
									<span class="muted">({m.optional()})</span></span
								>
								<input type="datetime-local" bind:value={pickup.time} />
							</label>
						</div>
					{/each}
					{#if leg.pickups.length < MAX_PICKUPS}
						<button type="button" class="btn add" onclick={addPickup}>
							+ {leg.pickups.length ? m.pickup_add_more() : m.pickup_add()}
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</fieldset>

<style>
	.leg {
		gap: var(--space-3);
	}

	legend {
		font-size: 1.05rem;
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-2);
	}

	@media (min-width: 34rem) {
		.modes {
			grid-template-columns: repeat(4, 1fr);
		}
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

	.pickup-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.add {
		border-style: dashed;
	}
</style>
