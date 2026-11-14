<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { FieldConfig, FieldType, TravelDirection } from '#lib/forms.js';
	import type { AnswerValue, TravelInput } from '#lib/registration.js';
	import FieldInput from './FieldInput.svelte';
	import LegEditor from './LegEditor.svelte';

	type Field = {
		id: string;
		type: FieldType;
		label: string;
		help: string;
		required: boolean;
		config: FieldConfig;
	};

	let {
		fields,
		answers,
		comment,
		travelInput,
		savedPlaces,
		near,
		answersLocked,
		isUpdate,
		answerErrors = {},
		travelErrors = {},
		oncancel
	}: {
		fields: Field[];
		answers: Record<string, AnswerValue>;
		comment: string;
		travelInput: TravelInput;
		savedPlaces: { id: string; label: string; area: string }[];
		near: { lat: number; lon: number } | null;
		answersLocked: boolean;
		isUpdate: boolean;
		answerErrors?: Record<string, string>;
		travelErrors?: Partial<Record<TravelDirection, string>>;
		oncancel?: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let travel = $state(structuredClone(travelInput));
	// svelte-ignore state_referenced_locally
	let commentText = $state(comment);
	let pending = $state(false);

	const travelField = $derived(fields.find((f) => f.type === 'travel'));
	const directions = $derived(travelField?.config.directions ?? []);
	const serialized = $derived(
		JSON.stringify(Object.fromEntries(directions.map((d) => [d, travel[d]])))
	);
</script>

<form
	method="post"
	action="?/register"
	class="stack-lg"
	novalidate
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			await update({ reset: false });
			pending = false;
		};
	}}
>
	<input type="hidden" name="travel" value={serialized} />

	{#each fields as field (field.id)}
		{#if field.type === 'travel'}
			<section class="travel stack">
				<div>
					<h3>{field.label}{field.required ? ' *' : ''}</h3>
					{#if field.help}<p class="muted small">{field.help}</p>{/if}
					<p class="muted small">{m.travel_intro()}</p>
				</div>
				{#each directions as direction (direction)}
					<LegEditor
						bind:leg={travel[direction]!}
						{direction}
						{savedPlaces}
						{near}
						error={travelErrors[direction] ?? null}
					/>
				{/each}
			</section>
		{:else}
			<FieldInput
				{field}
				initial={answers[field.id]}
				error={answerErrors[field.id] ?? null}
				disabled={answersLocked}
			/>
		{/if}
	{/each}

	{#if answersLocked}
		<p class="muted small">{m.registration_answers_locked()}</p>
	{/if}

	<label class="field">
		<span>{m.registration_comment()} <span class="muted">({m.optional()})</span></span>
		<textarea name="comment" rows="3" maxlength="2000" bind:value={commentText}></textarea>
	</label>

	{#if Object.keys(answerErrors).length || Object.keys(travelErrors).length}
		<p class="error" role="alert">{m.registration_error_summary()}</p>
	{/if}

	<div class="actions">
		<button class="btn btn-primary" disabled={pending}>
			{isUpdate ? m.registration_update() : m.registration_submit()}
		</button>
		{#if oncancel}
			<button type="button" class="btn" onclick={oncancel}>{m.cancel()}</button>
		{/if}
	</div>
</form>

<style>
	h3 {
		margin: 0 0 var(--space-1);
		font-size: 1.05rem;
	}

	.travel {
		padding: var(--space-4);
		margin-inline: calc(-1 * var(--space-2));
		border-radius: var(--radius);
		background: var(--bg);
	}

	.travel p {
		margin: 0;
	}
</style>
