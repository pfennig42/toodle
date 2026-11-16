<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/** Progress of creating an event: 1 = basics, 2 = registration form. */
	let { current }: { current: 1 | 2 } = $props();
	const steps = [m.setup_step_details, m.setup_step_form];
</script>

<ol class="steps" aria-label={m.setup_steps()}>
	{#each steps as label, i (i)}
		{@const n = i + 1}
		<li
			class:done={n < current}
			class:current={n === current}
			aria-current={n === current ? 'step' : undefined}
		>
			<span class="num" aria-hidden="true">{n < current ? '✓' : n}</span>
			<span>{label()}</span>
		</li>
	{/each}
</ol>

<style>
	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.steps li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.num {
		display: inline-grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		border: 1px solid var(--border);
		font-weight: 600;
		font-size: 0.8rem;
	}

	.current {
		color: var(--text);
		font-weight: 600;
	}

	.current .num {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-text);
	}

	.done .num {
		background: var(--accent-soft);
		border-color: transparent;
		color: var(--text);
	}
</style>
