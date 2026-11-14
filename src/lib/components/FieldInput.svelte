<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { FieldConfig, FieldType } from '#lib/forms.js';
	import type { AnswerValue } from '#lib/registration.js';

	let {
		field,
		initial,
		error = null,
		disabled = false
	}: {
		field: {
			id: string;
			type: FieldType;
			label: string;
			help: string;
			required: boolean;
			config: FieldConfig;
		};
		initial: AnswerValue | undefined;
		error?: string | null;
		disabled?: boolean;
	} = $props();

	// The form is posted natively (inputs named field_<id>). Local state + bind:* keeps
	// anything typed before hydration.
	// svelte-ignore state_referenced_locally
	let text = $state(
		typeof initial === 'string' || typeof initial === 'number' ? String(initial) : ''
	);
	// svelte-ignore state_referenced_locally
	let checked = $state(initial === true);
	// svelte-ignore state_referenced_locally
	let group = $state<string[]>(Array.isArray(initial) ? initial : []);

	const name = $derived(`field_${field.id}`);
	const inputId = $derived(`input_${field.id}`);
	const label = $derived(field.label + (field.required ? ' *' : ''));
</script>

<div class="field" class:invalid={!!error}>
	{#if field.type === 'checkbox'}
		<label class="check">
			<input type="checkbox" {name} bind:checked {disabled} />
			<span>{label}</span>
		</label>
	{:else if field.type === 'single_choice'}
		<fieldset class="choices" {disabled}>
			<legend>{label}</legend>
			{#each field.config.options ?? [] as option (option)}
				<label class="check">
					<input type="radio" {name} value={option} bind:group={text} />
					<span>{option}</span>
				</label>
			{/each}
		</fieldset>
	{:else if field.type === 'multi_choice'}
		<fieldset class="choices" {disabled}>
			<legend>{label}</legend>
			{#each field.config.options ?? [] as option (option)}
				<label class="check">
					<input type="checkbox" {name} value={option} bind:group />
					<span>{option}</span>
				</label>
			{/each}
		</fieldset>
	{:else}
		<label for={inputId}>{label}</label>
		{#if field.type === 'long_text'}
			<textarea id={inputId} {name} rows="4" maxlength="5000" {disabled} bind:value={text}
			></textarea>
		{:else if field.type === 'number'}
			<input id={inputId} {name} inputmode="decimal" {disabled} bind:value={text} />
		{:else if field.type === 'date'}
			<input id={inputId} {name} type="date" {disabled} bind:value={text} />
		{:else}
			<input id={inputId} {name} maxlength="500" {disabled} bind:value={text} />
		{/if}
	{/if}
	{#if field.help}<span class="muted small">{field.help}</span>{/if}
	{#if error}
		<span class="error small">
			{error === 'required' ? m.answer_error_required() : m.answer_error_invalid()}
		</span>
	{/if}
</div>

<style>
	.choices {
		gap: 0;
	}

	.choices legend {
		font-weight: 500;
		margin-bottom: var(--space-1);
	}

	.check {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--touch);
		cursor: pointer;
	}

	.check input {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		accent-color: var(--accent);
	}

	label:not(.check) {
		font-weight: 500;
	}
</style>
