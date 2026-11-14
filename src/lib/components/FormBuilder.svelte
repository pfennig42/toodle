<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import {
		FIELD_TYPES,
		hasOptions,
		MAX_FIELDS,
		type FieldDef,
		type FieldType,
		type TravelDirection
	} from '#lib/forms.js';
	import { fieldTypeIcon, fieldTypeLabel } from '#lib/field-labels.js';

	type Draft = FieldDef & { key: string; optionsText: string };

	let { initial, saving = false }: { initial: FieldDef[]; saving?: boolean } = $props();

	let counter = 0;
	const toDraft = (f: FieldDef): Draft => ({
		...f,
		config: { ...f.config },
		key: f.id ?? `new-${++counter}`,
		optionsText: (f.config.options ?? []).join('\n')
	});

	// svelte-ignore state_referenced_locally
	let fields = $state<Draft[]>(initial.map(toDraft));
	let picking = $state(false);

	const hasTravel = $derived(fields.some((f) => f.type === 'travel'));
	const serialized = $derived(
		JSON.stringify(
			fields.map(({ id, type, label, help, required, config, optionsText }) => ({
				id,
				type,
				label,
				help,
				required,
				config: hasOptions(type)
					? {
							options: optionsText
								.split('\n')
								.map((o) => o.trim())
								.filter(Boolean)
						}
					: type === 'travel'
						? { directions: config.directions }
						: {}
			}))
		)
	);
	// Snapshot of the loaded state – the component is re-created after each save.
	// svelte-ignore state_referenced_locally
	const savedSnapshot = serialized;
	const dirty = $derived(serialized !== savedSnapshot);

	beforeNavigate((nav) => {
		if (dirty && nav.type !== 'form' && !confirm(m.builder_unsaved_confirm())) nav.cancel();
	});

	function add(type: FieldType) {
		const label = type === 'travel' ? m.field_travel_default_label() : '';
		fields.push(
			toDraft({
				type,
				label,
				help: '',
				required: type === 'travel',
				config: type === 'travel' ? { directions: ['to', 'from'] } : {}
			})
		);
		picking = false;
		const key = fields.at(-1)!.key;
		requestAnimationFrame(() => document.getElementById(`label-${key}`)?.focus());
	}

	function move(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= fields.length) return;
		const [f] = fields.splice(index, 1);
		fields.splice(target, 0, f);
	}

	function toggleDirection(field: Draft, dir: TravelDirection, on: boolean) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local temporary, not state
		const current = new Set(field.config.directions ?? []);
		if (on) current.add(dir);
		else current.delete(dir);
		if (current.size === 0) return; // at least one direction
		field.config.directions = (['to', 'from'] as const).filter((d) => current.has(d));
	}
</script>

<input type="hidden" name="fields" value={serialized} />

{#if fields.length === 0}
	<p class="card muted empty">{m.builder_empty()}</p>
{/if}

<ol class="fields">
	{#each fields as field, i (field.key)}
		<li class="card field-card" class:travel={field.type === 'travel'}>
			<div class="field-head">
				<span class="type"
					><span class="icon" aria-hidden="true">{fieldTypeIcon(field.type)}</span>{fieldTypeLabel(
						field.type
					)}</span
				>
				<span class="tools">
					<button
						type="button"
						class="btn small"
						onclick={() => move(i, -1)}
						disabled={i === 0}
						aria-label={m.builder_move_up()}
						title={m.builder_move_up()}>↑</button
					>
					<button
						type="button"
						class="btn small"
						onclick={() => move(i, 1)}
						disabled={i === fields.length - 1}
						aria-label={m.builder_move_down()}
						title={m.builder_move_down()}>↓</button
					>
					<button
						type="button"
						class="btn small"
						onclick={() => fields.splice(i, 1)}
						aria-label={m.remove()}
						title={m.remove()}>✕</button
					>
				</span>
			</div>

			<label class="field">
				<span>{m.builder_question()}</span>
				<input
					id="label-{field.key}"
					bind:value={field.label}
					maxlength="200"
					required
					placeholder={m.builder_question_placeholder()}
				/>
			</label>

			{#if hasOptions(field.type)}
				<label class="field">
					<span>{m.builder_options()}</span>
					<textarea
						bind:value={field.optionsText}
						rows="4"
						placeholder={m.builder_options_placeholder()}></textarea>
					<span class="muted small">{m.builder_options_hint()}</span>
				</label>
			{/if}

			{#if field.type === 'travel'}
				<div class="travel-info">
					<p class="small">{m.builder_travel_info()}</p>
					<div class="checks">
						<label class="check">
							<input
								type="checkbox"
								checked={field.config.directions?.includes('to')}
								onchange={(e) => toggleDirection(field, 'to', e.currentTarget.checked)}
							/>
							{m.travel_to()}
						</label>
						<label class="check">
							<input
								type="checkbox"
								checked={field.config.directions?.includes('from')}
								onchange={(e) => toggleDirection(field, 'from', e.currentTarget.checked)}
							/>
							{m.travel_from()}
						</label>
					</div>
				</div>
			{/if}

			<details class="more" open={!!field.help}>
				<summary>{m.builder_help()}</summary>
				<input bind:value={field.help} maxlength="500" aria-label={m.builder_help()} />
			</details>

			<label class="check">
				<input type="checkbox" bind:checked={field.required} />
				{m.builder_required()}
			</label>
		</li>
	{/each}
</ol>

{#if picking}
	<div class="card picker">
		<p class="small muted">{m.builder_pick_type()}</p>
		<div class="types">
			{#each FIELD_TYPES as type (type)}
				<button
					type="button"
					class="btn type-btn"
					disabled={type === 'travel' && hasTravel}
					onclick={() => add(type)}
				>
					<span class="icon" aria-hidden="true">{fieldTypeIcon(type)}</span>
					{fieldTypeLabel(type)}
				</button>
			{/each}
		</div>
		<button type="button" class="btn small" onclick={() => (picking = false)}>{m.cancel()}</button>
	</div>
{:else}
	<button
		type="button"
		class="btn add"
		onclick={() => (picking = true)}
		disabled={fields.length >= MAX_FIELDS}>+ {m.builder_add()}</button
	>
{/if}

<div class="save-bar" class:dirty>
	<span class="small muted" role="status"
		>{dirty ? m.builder_unsaved() : m.builder_all_saved()}</span
	>
	<button class="btn btn-primary" disabled={!dirty || saving}>{m.save()}</button>
</div>

<style>
	.fields {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.field-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.field-card.travel {
		border-color: var(--accent);
		box-shadow: inset 4px 0 0 var(--accent);
	}

	.field-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-2);
	}

	.type {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.icon {
		display: inline-grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 0.4rem;
		background: var(--surface-2);
		font-size: 0.8rem;
	}

	.tools {
		display: flex;
		gap: var(--space-1);
	}

	.tools .btn {
		min-width: 2.5rem;
	}

	.travel-info {
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--accent-soft);
	}

	.travel-info p {
		margin: 0 0 var(--space-2);
	}

	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch);
		cursor: pointer;
	}

	.check input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--accent);
	}

	.more summary {
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--text-muted);
		min-height: 2rem;
		display: flex;
		align-items: center;
	}

	.add {
		width: 100%;
		margin-top: var(--space-3);
		border-style: dashed;
	}

	.picker {
		margin-top: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.picker p {
		margin: 0;
	}

	.types {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: var(--space-2);
	}

	.type-btn {
		justify-content: flex-start;
	}

	.empty {
		padding: var(--space-4);
	}

	/* Sticky save bar – sits above the bottom navigation on phones */
	.save-bar {
		position: sticky;
		bottom: var(--space-3);
		z-index: 5;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-6);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: 0 4px 20px rgb(0 0 0 / 0.08);
	}

	.save-bar.dirty {
		border-color: var(--accent);
	}

	/* Always the same position: if the bar moved when a field loses focus,
	   a tap on "Save" could land next to the button. */
	@media (max-width: 40rem) {
		.save-bar {
			bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + var(--space-2));
		}
	}
</style>
