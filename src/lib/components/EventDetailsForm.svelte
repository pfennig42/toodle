<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { DEFAULT_TIMEZONE, timeZoneOptions } from '#lib/datetime.js';
	import type { EventFormValues } from '#lib/event-form.js';
	import {
		LARGE_EVENT,
		RIDE_VISIBILITIES,
		widensVisibility,
		type RideVisibility
	} from '#lib/ride-visibility.js';
	import { onMount, untrack } from 'svelte';
	import AddressSearch from './AddressSearch.svelte';
	import DateRangePicker from './DateRangePicker.svelte';

	let {
		values,
		errors = [],
		submitLabel,
		savedVisibility = null,
		registrations = 0
	}: {
		values: EventFormValues;
		errors?: string[];
		submitLabel: string;
		/** Stored setting of an existing event – to ask before widening it */
		savedVisibility?: RideVisibility | null;
		registrations?: number;
	} = $props();

	// Local editable copy (the form posts natively, so plain inputs are enough).
	// Local editable copy. All inputs use bind:value – unlike a plain value attribute,
	// this keeps what people typed before the JavaScript finished loading (slow networks).
	// svelte-ignore state_referenced_locally
	let v = $state({ ...values });
	// svelte-ignore state_referenced_locally
	let location = $state(values.location);
	// svelte-ignore state_referenced_locally
	let startDate = $state(values.startDate);
	// svelte-ignore state_referenced_locally
	let endDate = $state(values.endDate);

	// The range calendar needs JavaScript – until hydration the plain date inputs are shown.
	let enhanced = $state(false);
	onMount(() => (enhanced = true));

	const visibilityText: Record<RideVisibility, [() => string, () => string]> = {
		public: [m.event_visibility_public, m.event_visibility_public_hint],
		matched: [m.event_visibility_matched, m.event_visibility_matched_hint],
		internal: [m.event_visibility_internal, m.event_visibility_internal_hint]
	};
	// Big events: suggest not showing everybody's rides to everybody.
	const suggestMatched = $derived(
		v.rideVisibility === 'public' &&
			(Number(v.capacity) > LARGE_EVENT || registrations > LARGE_EVENT)
	);
	const askWiden = $derived(
		!!savedVisibility && registrations > 0 && widensVisibility(savedVisibility, v.rideVisibility)
	);

	const zones = $derived(timeZoneOptions(values.timezone || DEFAULT_TIMEZONE));
	const has = (key: string) => errors.includes(key);

	/** Suggest an end two days later when only the start is set – the typical weekend event. */
	function suggestEnd() {
		if (startDate && !endDate) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local temporary, not state
			const d = new Date(startDate + 'T12:00:00Z');
			d.setUTCDate(d.getUTCDate() + 2);
			endDate = d.toISOString().slice(0, 10);
		}
	}
</script>

<!--
	A time of day is folded away until someone asks for it. Whether it starts open depends only on
	the value when rendered (untrack) – a half-typed time reads as "" and must not snap it shut.
-->
{#snippet timeField(
	key: 'startTime' | 'endTime' | 'deadlineTime',
	what: string,
	summary = m.event_add_time(),
	label = m.event_time()
)}
	<details class="time" open={untrack(() => !!v[key])}>
		<summary aria-label={m.event_add_time_of({ what })}>{summary}</summary>
		<label class="field">
			<span>{label}</span>
			<input type="time" name={key} bind:value={v[key]} aria-label={m.event_time_of({ what })} />
		</label>
	</details>
{/snippet}

<div class="stack">
	<label class="field">
		<span>{m.event_title()}</span>
		<input name="title" required maxlength="150" bind:value={v.title} />
		{#if has('title')}<span class="error small">{m.event_error_title()}</span>{/if}
	</label>

	<fieldset>
		<legend>{m.event_when()}</legend>
		{#if enhanced}
			<DateRangePicker
				id="event-dates"
				label={m.event_dates()}
				bind:start={startDate}
				bind:end={endDate}
				invalid={has('start') || has('end') || has('end_before_start')}
			/>
			{#if has('start') || has('end')}<span class="error small">{m.event_error_date()}</span>{/if}
			<div class="times">
				{@render timeField(
					'startTime',
					m.event_starts(),
					m.event_add_start_time(),
					m.event_start_time()
				)}
				{@render timeField('endTime', m.event_ends(), m.event_add_end_time(), m.event_end_time())}
			</div>
		{:else}
			<!-- until the JavaScript is there: plain date inputs (also what slow networks see first) -->
			<div class="when">
				<label class="field">
					<span>{m.event_starts()}</span>
					<input
						type="date"
						name="startDate"
						required
						bind:value={startDate}
						onchange={suggestEnd}
					/>
				</label>
				{@render timeField('startTime', m.event_starts())}
			</div>
			{#if has('start')}<span class="error small">{m.event_error_date()}</span>{/if}
			<div class="when">
				<label class="field">
					<span>{m.event_ends()}</span>
					<input type="date" name="endDate" required bind:value={endDate} min={startDate} />
				</label>
				{@render timeField('endTime', m.event_ends())}
			</div>
			{#if has('end')}<span class="error small">{m.event_error_date()}</span>{/if}
		{/if}
		{#if has('end_before_start')}<span class="error small">{m.event_error_end_before_start()}</span
			>{/if}
		<label class="field">
			<span>{m.event_timezone()}</span>
			<select name="timezone" bind:value={v.timezone}>
				{#each zones as tz (tz)}
					<option value={tz}>{tz.replace('_', ' ')}</option>
				{/each}
			</select>
		</label>
	</fieldset>

	<fieldset>
		<legend>{m.event_where()}</legend>
		<label class="field">
			<span>{m.event_location_name()} <span class="muted">({m.optional()})</span></span>
			<input
				name="locationName"
				maxlength="150"
				bind:value={v.locationName}
				placeholder={m.event_location_name_placeholder()}
			/>
		</label>
		<div class="field">
			<label for="event-address">{m.place_address()}</label>
			<AddressSearch id="event-address" bind:value={location} />
			<span class="muted small">{m.event_location_hint()}</span>
			{#if has('location')}<span class="error small">{m.event_error_location()}</span>{/if}
		</div>
	</fieldset>

	<fieldset>
		<legend>{m.event_registration()}</legend>
		<div class="stack">
			<div class="when">
				<label class="field">
					<span>{m.event_deadline()} <span class="muted">({m.optional()})</span></span>
					<input type="date" name="deadlineDate" bind:value={v.deadlineDate} max={endDate} />
				</label>
				{@render timeField('deadlineTime', m.event_deadline())}
				{#if has('deadline')}<span class="error small full">{m.event_error_deadline()}</span>{/if}
			</div>
			<label class="field">
				<span>{m.event_capacity()} <span class="muted">({m.optional()})</span></span>
				<input
					type="number"
					name="capacity"
					min="1"
					max="100000"
					inputmode="numeric"
					bind:value={v.capacity}
				/>
				{#if has('capacity')}<span class="error small">{m.event_error_capacity()}</span>{/if}
			</label>
		</div>
	</fieldset>

	<fieldset>
		<legend>{m.event_rides_visibility()}</legend>
		<div class="visibility">
			{#each RIDE_VISIBILITIES as option (option)}
				{@const [label, hint] = visibilityText[option]}
				<label class="option">
					<input type="radio" name="rideVisibility" value={option} bind:group={v.rideVisibility} />
					<span>
						<strong>{label()}</strong>
						<span class="muted small">{hint()}</span>
					</span>
				</label>
			{/each}
		</div>
		{#if suggestMatched}
			<div class="suggest small" role="status">
				<p>{m.event_visibility_large({ count: LARGE_EVENT })}</p>
				<button type="button" class="btn small" onclick={() => (v.rideVisibility = 'matched')}
					>{m.event_visibility_large_action()}</button
				>
			</div>
		{/if}
		{#if askWiden}
			<label class="option confirm">
				<input type="checkbox" name="confirmWiden" required />
				<span class="small">{m.event_visibility_widen_confirm()}</span>
			</label>
		{/if}
		{#if has('visibility_widen')}<span class="error small">{m.event_error_visibility_widen()}</span
			>{/if}
	</fieldset>

	<label class="field">
		<span>{m.event_description()} <span class="muted">({m.optional()})</span></span>
		<textarea name="description" rows="6" maxlength="5000" bind:value={v.description}></textarea>
		<span class="muted small">{m.event_description_hint()}</span>
	</label>

	<div class="actions">
		<button class="btn btn-primary">{submitLabel}</button>
	</div>
</div>

<style>
	/* date and its optional time side by side – also on phones */
	.when {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: var(--space-2);
		align-items: end;
	}

	.times {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: 0 var(--space-4);
		align-items: end;
	}

	.when input {
		width: 100%;
		min-width: 0;
	}

	/* the time stays folded away until someone asks for it */
	.time > summary {
		display: flex;
		align-items: center;
		min-height: var(--touch);
		color: var(--accent);
		cursor: pointer;
		list-style: none;
	}

	.time > summary::-webkit-details-marker {
		display: none;
	}

	.time[open] > summary {
		display: none;
	}

	.full {
		grid-column: 1 / -1;
	}

	.visibility {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.option {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
	}

	.option:has(input:checked) {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.option input {
		width: 1.25rem;
		height: 1.25rem;
		margin: 0.1rem 0 0;
		flex-shrink: 0;
		accent-color: var(--accent);
	}

	.option > span {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.option.confirm {
		border-color: var(--coral);
	}

	.suggest {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.suggest p {
		margin: 0;
		flex: 1 1 16rem;
	}
</style>
