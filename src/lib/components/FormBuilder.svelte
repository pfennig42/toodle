<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import {
		FIELD_TYPES,
		hasOptions,
		normalizeLinkUrl,
		MAX_FIELDS,
		MAX_LINKS,
		type FieldDef,
		type FieldLink,
		type FieldType,
		type TravelDirection
	} from '#lib/forms.js';
	import { fieldTypeIcon, fieldTypeLabel } from '#lib/field-labels.js';
	import FormPreview from './FormPreview.svelte';

	type Draft = FieldDef & {
		key: string;
		optionsText: string;
		links: LinkDraft[];
		/** extras are tucked away until asked for (or already filled) */
		showHelp: boolean;
	};
	type LinkDraft = { key: string; url: string; text: string };

	let {
		initial,
		saving = false,
		finishLabel
	}: {
		initial: FieldDef[];
		saving?: boolean;
		/** Setup mode: the button finishes the wizard (always enabled) instead of "Save". */
		finishLabel?: string;
	} = $props();

	let counter = 0;
	const toDraft = (f: FieldDef): Draft => ({
		...f,
		config: { ...f.config },
		key: f.id ?? `new-${++counter}`,
		optionsText: (f.config.options ?? []).join('\n'),
		links: (f.config.links ?? []).map((l) => ({ ...l, key: `link-${++counter}` })),
		showHelp: !!f.help
	});
	/** The links as guests will see them – empty and not (yet) valid addresses left out */
	function linksOf(d: Draft): FieldLink[] {
		return d.links.flatMap((l) => {
			const url = normalizeLinkUrl(l.url);
			return url && url !== 'invalid' ? [{ url, text: l.text.trim() }] : [];
		});
	}
	const badLink = (l: LinkDraft) => normalizeLinkUrl(l.url) === 'invalid';
	const optionsOf = (d: Draft) =>
		d.optionsText
			.split('\n')
			.map((o) => o.trim())
			.filter(Boolean);

	// svelte-ignore state_referenced_locally
	const initialTravel = initial.find((f) => f.type === 'travel');
	// Travel is a switch, not a removable question. Its settings are kept while switched off.
	let travelOn = $state(!!initialTravel);
	let travel = $state<Draft>(
		toDraft(
			initialTravel ?? {
				type: 'travel',
				label: m.field_travel_default_label(),
				help: '',
				required: true,
				config: { directions: ['to', 'from'] }
			}
		)
	);
	// svelte-ignore state_referenced_locally
	let questions = $state<Draft[]>(initial.filter((f) => f.type !== 'travel').map(toDraft));

	/** Only one thing is open for editing at a time – everything else stays a calm list. */
	let open = $state<string | null>(null);
	let view = $state<'edit' | 'preview'>('edit');
	let adding = $state(false);
	let problems = $state<Record<string, string>>({});

	const QUESTION_TYPES = FIELD_TYPES.filter((t) => t !== 'travel');
	const EXAMPLES: Record<Exclude<FieldType, 'travel'>, () => string> = {
		short_text: m.builder_example_short_text,
		long_text: m.builder_example_long_text,
		number: m.builder_example_number,
		date: m.builder_example_date,
		single_choice: m.builder_example_single_choice,
		multi_choice: m.builder_example_multi_choice,
		checkbox: m.builder_example_checkbox
	};

	const serialized = $derived(
		JSON.stringify(
			// travel always comes first in the registration form
			[...(travelOn ? [travel] : []), ...questions].map((d) => ({
				id: d.id,
				type: d.type,
				label: d.label,
				help: d.help,
				required: d.required,
				config:
					d.type === 'travel'
						? { directions: d.config.directions }
						: {
								...(hasOptions(d.type) ? { options: optionsOf(d) } : {}),
								// sent as typed – the server normalizes and rejects bad addresses
								...(d.links.some((l) => l.url.trim())
									? {
											links: d.links
												.filter((l) => l.url.trim())
												.map(({ url, text }) => ({ url, text }))
										}
									: {})
							}
			}))
		)
	);
	// Snapshot of the loaded state – the component is re-created after each save.
	// svelte-ignore state_referenced_locally
	const savedSnapshot = serialized;
	const dirty = $derived(serialized !== savedSnapshot);

	const preview = $derived({
		travel: travelOn
			? {
					label: travel.label,
					help: travel.help,
					required: travel.required,
					directions: travel.config.directions ?? []
				}
			: null,
		questions: questions.map((q) => ({
			...q,
			config: {
				...(hasOptions(q.type) ? { options: optionsOf(q) } : {}),
				links: linksOf(q)
			}
		}))
	});

	/**
	 * Set while our own form is being sent: the redirect that follows (e.g. "Fertig" → overview)
	 * is not "leaving with unsaved changes". Cleared again when the save comes back without
	 * leaving the page (an error, or a plain save in the form tab).
	 */
	let submitting = false;
	$effect(() => {
		if (!saving) submitting = false;
	});

	beforeNavigate((nav) => {
		if (submitting || !dirty || nav.type === 'form') return;
		if (!confirm(m.builder_unsaved_confirm())) nav.cancel();
	});

	function focusLabel(key: string) {
		requestAnimationFrame(() => document.getElementById(`label-${key}`)?.focus());
	}

	function add(type: FieldType) {
		const draft = toDraft({ type, label: '', help: '', required: false, config: {} });
		questions.push(draft);
		adding = false;
		open = draft.key;
		focusLabel(draft.key);
	}

	const focusLater = (id: string) =>
		requestAnimationFrame(() => document.getElementById(id)?.focus());

	/** Extras of a question: an explanation and links – shown when asked for, removable again. */
	function addHelp(q: Draft) {
		q.showHelp = true;
		focusLater(`help-${q.key}`);
	}

	function removeHelp(q: Draft) {
		q.help = '';
		q.showHelp = false;
		focusLater(`add-help-${q.key}`);
	}

	function addLink(q: Draft) {
		const link = { key: `link-${++counter}`, url: '', text: '' };
		q.links.push(link);
		focusLater(`url-${link.key}`);
	}

	function removeLink(q: Draft, index: number) {
		q.links.splice(index, 1);
		focusLater(`add-link-${q.key}`);
	}

	function move(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= questions.length) return;
		const [f] = questions.splice(index, 1);
		questions.splice(target, 0, f);
	}

	function toggleDirection(dir: TravelDirection, on: boolean) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local temporary, not state
		const current = new Set(travel.config.directions ?? []);
		if (on) current.add(dir);
		else current.delete(dir);
		if (current.size === 0) return; // at least one direction
		travel.config.directions = (['to', 'from'] as const).filter((d) => current.has(d));
	}

	/** Catch the obvious before sending: an empty question or a choice without choices. */
	function check(event: MouseEvent) {
		const found: Record<string, string> = {};
		for (const q of questions) {
			if (!q.label.trim()) found[q.key] = m.builder_error_need_label();
			else if (hasOptions(q.type) && optionsOf(q).length < 2)
				found[q.key] = m.builder_error_need_options();
			else if (q.links.some(badLink)) found[q.key] = m.builder_error_need_link();
		}
		problems = found;
		const first = questions.find((q) => found[q.key]);
		if (first) {
			event.preventDefault();
			view = 'edit';
			open = first.key;
			focusLabel(first.key);
			return;
		}
		submitting = true;
	}
</script>

<input type="hidden" name="fields" value={serialized} />

<div class="head">
	<div class="segmented" role="group" aria-label={m.builder_views()}>
		<button type="button" aria-pressed={view === 'edit'} onclick={() => (view = 'edit')}
			>{m.builder_view_edit()}</button
		>
		<button type="button" aria-pressed={view === 'preview'} onclick={() => (view = 'preview')}
			>{m.builder_view_preview()}</button
		>
	</div>
</div>

{#if view === 'preview'}
	<p class="muted small preview-title">{m.builder_preview_title()}</p>
	<FormPreview travel={preview.travel} questions={preview.questions} />
{:else}
	{#snippet given(title: string, type: FieldType)}
		<!-- always part of the form (prefilled / optional), nothing to set up -->
		<li class="item given">
			<p class="item-title">{title}</p>
			<p class="muted small">{fieldTypeLabel(type)}</p>
		</li>
	{/snippet}

	<ul class="items">
		{@render given(m.field_name(), 'short_text')}
		{@render given(m.field_email(), 'short_text')}

		<!-- travel: one switch; the details only when asked for -->
		<li class="item travel" class:open={open === 'travel'} class:off={!travelOn}>
			<div class="travel-head">
				<div>
					<p class="item-title">{m.builder_travel_title()}</p>
					<p class="muted small">
						{travelOn ? m.builder_travel_benefit() : m.builder_travel_off_hint()}
					</p>
				</div>
				<label class="switch">
					<input type="checkbox" role="switch" bind:checked={travelOn} />
					<span class="visually-hidden">{m.builder_travel_toggle()}</span>
				</label>
			</div>
			{#if travelOn}
				<button
					type="button"
					class="link-btn"
					aria-expanded={open === 'travel'}
					onclick={() => (open = open === 'travel' ? null : 'travel')}
					>{m.builder_customize()}</button
				>
				{#if open === 'travel'}
					<div class="editor">
						<label class="field">
							<span>{m.builder_travel_heading()}</span>
							<input id="label-{travel.key}" bind:value={travel.label} maxlength="200" />
						</label>
						<fieldset class="plain-set">
							<legend>{m.builder_travel_directions()}</legend>
							<div class="checks">
								<label class="check">
									<input
										type="checkbox"
										checked={travel.config.directions?.includes('to')}
										onchange={(e) => toggleDirection('to', e.currentTarget.checked)}
									/>
									{m.travel_to()}
								</label>
								<label class="check">
									<input
										type="checkbox"
										checked={travel.config.directions?.includes('from')}
										onchange={(e) => toggleDirection('from', e.currentTarget.checked)}
									/>
									{m.travel_from()}
								</label>
							</div>
						</fieldset>
						<label class="field">
							<span>{m.builder_guest_help()} <span class="muted">({m.optional()})</span></span>
							<input bind:value={travel.help} maxlength="500" />
						</label>
						<label class="check">
							<input type="checkbox" bind:checked={travel.required} />
							{m.builder_must_answer()}
						</label>
						<div class="editor-foot">
							<span></span>
							<button type="button" class="btn small" onclick={() => (open = null)}
								>{m.builder_done()}</button
							>
						</div>
					</div>
				{/if}
			{/if}
		</li>

		{#each questions as q, i (q.key)}
			<li class="item" class:open={open === q.key} class:problem={problems[q.key]}>
				<!-- the header toggles: click to open, click again to close -->
				<button
					type="button"
					class="row"
					aria-expanded={open === q.key}
					onclick={() => {
						if (open === q.key) {
							open = null;
						} else {
							open = q.key;
							focusLabel(q.key);
						}
					}}
				>
					<span class="row-text">
						<span class="item-title">{q.label || m.builder_new_question()}</span>
						<span class="muted small"
							>{fieldTypeLabel(q.type)}{q.required ? ` · ${m.builder_must_answer()}` : ''}</span
						>
						{#if problems[q.key] && open !== q.key}<span class="error small">{problems[q.key]}</span
							>{/if}
					</span>
					<span class="chevron" aria-hidden="true">›</span>
				</button>
				{#if open === q.key}
					<div class="editor">
						<label class="field">
							<span>{m.builder_your_question()}</span>
							<input
								id="label-{q.key}"
								bind:value={q.label}
								maxlength="200"
								placeholder={m.builder_question_placeholder()}
								aria-invalid={problems[q.key] && !q.label.trim() ? 'true' : undefined}
							/>
						</label>
						{#if hasOptions(q.type)}
							<label class="field">
								<span>{m.builder_choices()}</span>
								<textarea
									bind:value={q.optionsText}
									rows="4"
									placeholder={m.builder_options_placeholder()}></textarea>
								<span class="muted small">{m.builder_choices_hint()}</span>
							</label>
						{/if}
						{#if problems[q.key]}<p class="error small" role="alert">{problems[q.key]}</p>{/if}
						<label class="check">
							<input type="checkbox" bind:checked={q.required} />
							{m.builder_must_answer()}
						</label>
						{#if q.showHelp}
							<div class="removable">
								<label class="field">
									<span>{m.builder_guest_help()} <span class="muted">({m.optional()})</span></span>
									<input
										id="help-{q.key}"
										bind:value={q.help}
										maxlength="500"
										placeholder={m.builder_help_placeholder()}
									/>
								</label>
								<button
									type="button"
									class="icon-btn remove"
									onclick={() => removeHelp(q)}
									aria-label={m.builder_remove_help()}
									title={m.builder_remove_help()}>✕</button
								>
							</div>
						{/if}
						{#each q.links as link, li (link.key)}
							<div class="removable link-row">
								<div class="link-fields">
									<label class="field">
										<span>{m.builder_link_url()}</span>
										<!-- not type="url": that would refuse "example.org" (we add https:// ourselves) -->
										<input
											id="url-{link.key}"
											bind:value={link.url}
											inputmode="url"
											autocomplete="url"
											maxlength="500"
											placeholder="https://…"
											aria-invalid={problems[q.key] && badLink(link) ? 'true' : undefined}
										/>
									</label>
									<label class="field">
										<span>{m.builder_link_text()} <span class="muted">({m.optional()})</span></span>
										<input
											bind:value={link.text}
											maxlength="120"
											placeholder={m.builder_link_text_placeholder()}
										/>
									</label>
								</div>
								<button
									type="button"
									class="icon-btn remove"
									onclick={() => removeLink(q, li)}
									aria-label={m.builder_remove_link()}
									title={m.builder_remove_link()}>✕</button
								>
							</div>
						{/each}
						{#if !q.showHelp || q.links.length < MAX_LINKS}
							<div class="extras">
								{#if !q.showHelp}
									<button
										type="button"
										class="extra"
										id="add-help-{q.key}"
										onclick={() => addHelp(q)}>+ {m.builder_add_help()}</button
									>
								{/if}
								{#if q.links.length < MAX_LINKS}
									<button
										type="button"
										class="extra"
										id="add-link-{q.key}"
										onclick={() => addLink(q)}>+ {m.builder_add_link()}</button
									>
								{/if}
							</div>
						{/if}
						<div class="editor-foot">
							<span class="tools">
								<button
									type="button"
									class="icon-btn"
									onclick={() => move(i, -1)}
									disabled={i === 0}
									aria-label={m.builder_move_up()}
									title={m.builder_move_up()}>↑</button
								>
								<button
									type="button"
									class="icon-btn"
									onclick={() => move(i, 1)}
									disabled={i === questions.length - 1}
									aria-label={m.builder_move_down()}
									title={m.builder_move_down()}>↓</button
								>
								<button
									type="button"
									class="link-btn danger"
									onclick={() => {
										questions.splice(i, 1);
										open = null;
									}}>{m.builder_delete_question()}</button
								>
							</span>
							<button type="button" class="btn small" onclick={() => (open = null)}
								>{m.builder_done()}</button
							>
						</div>
					</div>
				{/if}
			</li>
		{/each}

		{@render given(m.registration_comment(), 'long_text')}
	</ul>

	{#if questions.length + 1 < MAX_FIELDS}
		<details class="add" bind:open={adding}>
			<summary>+ {m.builder_add()}</summary>
			<p class="add-title">{m.builder_add_title()}</p>
			<ul class="types">
				{#each QUESTION_TYPES as type (type)}
					<li>
						<button type="button" class="type" onclick={() => add(type)}>
							<span class="type-icon" aria-hidden="true">{fieldTypeIcon(type)}</span>
							<span class="type-text">
								<span class="type-name">{fieldTypeLabel(type)}</span>
								<span class="muted small">{EXAMPLES[type as Exclude<FieldType, 'travel'>]()}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
{/if}

{#if finishLabel}
	<!-- creating an event: just one clear way forward -->
	<div class="finish">
		<button class="btn btn-go" disabled={saving} onclick={check}>{finishLabel}</button>
	</div>
{:else}
	<div class="save-bar" class:dirty>
		<span class="small muted" role="status"
			>{dirty ? m.builder_unsaved() : m.builder_all_saved()}</span
		>
		<button class="btn btn-primary" disabled={!dirty || saving} onclick={check}>{m.save()}</button>
	</div>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.given {
		padding-block: var(--space-3);
	}

	.given p {
		margin: 0;
	}

	.preview-title {
		margin: 0 0 var(--space-2);
	}

	/* a calm list: rows separated by a hairline, no boxes */
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--border);
	}

	.item {
		border-bottom: 1px solid var(--border);
	}

	/* only what is being edited gets weight */
	.item.open {
		margin: var(--space-2) calc(-1 * var(--space-3));
		padding: var(--space-1) var(--space-3);
		border: 0;
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: 0 2px 16px rgb(0 0 0 / 0.08);
	}

	.item-title {
		margin: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.travel {
		padding-block: var(--space-3);
	}

	.travel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.travel-head p {
		margin: 0;
	}

	.travel-head .muted {
		margin-top: var(--space-1);
		max-width: 34rem;
	}

	.travel.off .item-title {
		color: var(--text-muted);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		min-height: var(--touch);
		padding: var(--space-3) 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.row-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.chevron {
		display: inline-block;
		transition: transform 0.15s;
		color: var(--text-muted);
		font-size: 1.4rem;
		line-height: 1;
	}

	.row[aria-expanded='true'] .chevron {
		transform: rotate(90deg);
	}

	.row:hover .chevron {
		color: var(--text);
	}

	.item.problem:not(.open) .item-title {
		color: var(--danger);
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-block: var(--space-3);
	}

	.editor > p {
		margin: 0;
	}

	.editor-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.icon-btn {
		min-width: var(--touch);
		min-height: var(--touch);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--text-muted);
		font: inherit;
		cursor: pointer;
	}

	.icon-btn:hover:not(:disabled) {
		background: var(--surface-2);
		color: var(--text);
	}

	.icon-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.link-btn {
		min-height: var(--touch);
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.link-btn.danger {
		margin-left: var(--space-2);
		color: var(--danger);
	}

	.plain-set {
		margin: 0;
		padding: 0;
		border: 0;
	}

	.plain-set legend {
		padding: 0;
		margin-bottom: var(--space-1);
		font-weight: 500;
	}

	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	.check {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch);
		cursor: pointer;
	}

	.check input {
		width: 1.2rem;
		height: 1.2rem;
		accent-color: var(--accent);
	}

	/* optional extras of a question: clearly buttons, but quieter than the main actions */
	.extras {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.extra {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding: 0 var(--space-4);
		border: 1px dashed var(--border);
		border-radius: 999px;
		background: none;
		color: var(--accent);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.extra:hover,
	.extra:focus-visible {
		border-style: solid;
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	/* a field (or pair of fields) with its remove button at the end */
	.removable {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-2);
		align-items: end;
	}

	/* address and text of one link belong together – visible also when stacked on phones */
	.link-row {
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.link-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: var(--space-3);
	}

	/* adding a question: a gentle menu, no toolbox */
	.add {
		margin-top: var(--space-3);
	}

	.add summary {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding: 0 var(--space-1);
		color: var(--accent);
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}

	.add summary::-webkit-details-marker {
		display: none;
	}

	.add[open] summary {
		color: var(--text-muted);
	}

	.add-title {
		margin: var(--space-2) 0;
		font-weight: 600;
	}

	/* one tile per question type: icon, name and an example – clearly something to tap */
	.types {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: var(--space-2);
	}

	.types li {
		display: flex;
	}

	.type {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		width: 100%;
		min-height: var(--touch);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.type:hover,
	.type:focus-visible {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.type:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 0;
	}

	.type-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		background: var(--surface-2);
		color: var(--accent);
		font-weight: 700;
	}

	.type-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.type-name {
		font-weight: 600;
	}

	.switch {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		cursor: pointer;
	}

	.switch input {
		appearance: none;
		position: relative;
		flex-shrink: 0;
		width: 2.8rem;
		height: 1.6rem;
		margin: 0;
		border-radius: 999px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		cursor: pointer;
		transition: background 0.15s;
	}

	.switch input::after {
		content: '';
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 50%;
		background: var(--text-muted);
		transition: transform 0.15s;
	}

	.switch input:checked {
		background: var(--accent);
		border-color: var(--accent);
	}

	.switch input:checked::after {
		transform: translateX(1.2rem);
		background: var(--accent-text);
	}

	@media (prefers-reduced-motion: reduce) {
		.chevron,
		.switch input,
		.switch input::after {
			transition: none;
		}
	}

	.finish {
		margin-top: var(--space-6);
	}

	.btn-go {
		min-width: 9rem;
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-text);
		font-weight: 600;
	}

	.btn-go:hover:not(:disabled) {
		filter: brightness(1.06);
	}

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
