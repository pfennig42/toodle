<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { DEFAULT_TIMEZONE, timeZoneOptions } from '#lib/datetime.js';
	import type { EventFormValues } from '#lib/event-form.js';
	import AddressSearch from './AddressSearch.svelte';

	let {
		values,
		errors = [],
		submitLabel
	}: { values: EventFormValues; errors?: string[]; submitLabel: string } = $props();

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

<div class="stack">
	<label class="field">
		<span>{m.event_title()}</span>
		<input name="title" required maxlength="150" bind:value={v.title} />
		{#if has('title')}<span class="error small">{m.event_error_title()}</span>{/if}
	</label>

	<fieldset>
		<legend>{m.event_when()}</legend>
		<div class="when">
			<label class="field">
				<span>{m.event_starts()}</span>
				<input type="date" name="startDate" required bind:value={startDate} onchange={suggestEnd} />
			</label>
			<label class="field">
				<span>{m.event_time()}</span>
				<input
					type="time"
					name="startTime"
					bind:value={v.startTime}
					aria-label={m.event_time_of({ what: m.event_starts() })}
				/>
			</label>
		</div>
		{#if has('start')}<span class="error small">{m.event_error_date()}</span>{/if}
		<div class="when">
			<label class="field">
				<span>{m.event_ends()}</span>
				<input type="date" name="endDate" required bind:value={endDate} min={startDate} />
			</label>
			<label class="field">
				<span>{m.event_time()}</span>
				<input
					type="time"
					name="endTime"
					bind:value={v.endTime}
					aria-label={m.event_time_of({ what: m.event_ends() })}
				/>
			</label>
		</div>
		{#if has('end')}<span class="error small">{m.event_error_date()}</span>{/if}
		{#if has('end_before_start')}<span class="error small">{m.event_error_end_before_start()}</span
			>{/if}
		<p class="muted small">{m.event_time_hint()}</p>
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
				<label class="field">
					<span>{m.event_time()}</span>
					<input
						type="time"
						name="deadlineTime"
						bind:value={v.deadlineTime}
						aria-label={m.event_time_of({ what: m.event_deadline() })}
					/>
				</label>
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

	.when input {
		width: 100%;
		min-width: 0;
	}

	.full {
		grid-column: 1 / -1;
	}
</style>
