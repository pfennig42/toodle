<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { FieldDef, TravelDirection } from '#lib/forms.js';
	import type { LegInput } from '#lib/registration.js';
	import AccountFields from './AccountFields.svelte';
	import FieldInput from './FieldInput.svelte';
	import LegEditor from './LegEditor.svelte';

	/**
	 * The registration form as guests will see it – built from the same components, but inert
	 * (not focusable or clickable; the server only reads the builder's `fields`).
	 */
	let {
		travel,
		questions
	}: {
		travel: {
			label: string;
			help: string;
			required: boolean;
			directions: TravelDirection[];
		} | null;
		questions: (FieldDef & { key: string })[];
	} = $props();

	const emptyLeg = (): LegInput => ({
		mode: null,
		time: '',
		place: null,
		carStatus: 'offering',
		carNote: '',
		pickups: []
	});
	let legs = $state<Record<TravelDirection, LegInput>>({ to: emptyLeg(), from: emptyLeg() });
</script>

<div class="preview" inert>
	<div class="stack-lg">
		<AccountFields example />
		{#if travel}
			<section class="travel stack">
				<div>
					<h3>{travel.label}{travel.required ? ' *' : ''}</h3>
					{#if travel.help}<p class="muted small">{travel.help}</p>{/if}
					<p class="muted small">{m.travel_intro()}</p>
				</div>
				{#each travel.directions as direction (direction)}
					<LegEditor bind:leg={legs[direction]} {direction} savedPlaces={[]} near={null} />
				{/each}
			</section>
		{/if}

		{#each questions as q (q.key)}
			<FieldInput
				field={{ ...q, id: `preview-${q.key}`, label: q.label || m.builder_new_question() }}
				initial={undefined}
			/>
		{/each}

		<label class="field">
			<span>{m.registration_comment()} <span class="muted">({m.optional()})</span></span>
			<textarea rows="3"></textarea>
		</label>

		<div class="actions">
			<span class="btn btn-primary">{m.registration_submit()}</span>
		</div>
	</div>
</div>

<style>
	.preview {
		padding: var(--space-4);
		border-radius: var(--radius);
		background: var(--surface);
		/* looks like the real thing, but clearly a picture of it */
		user-select: none;
	}

	h3 {
		margin: 0 0 var(--space-1);
		font-size: 1.05rem;
	}

	.travel p {
		margin: 0;
	}
</style>
