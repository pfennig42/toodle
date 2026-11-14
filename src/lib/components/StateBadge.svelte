<script lang="ts">
	import { stateLabel, type RegistrationState } from '#lib/event-status.js';

	let { state }: { state: RegistrationState } = $props();
</script>

<span class="badge badge-{state}">{stateLabel(state)}</span>

<style>
	.badge {
		display: inline-block;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		background: var(--surface-2);
		color: var(--text-muted);
	}

	.badge-open {
		background: var(--accent-soft);
		color: var(--accent);
	}

	.badge-draft {
		background: color-mix(in srgb, var(--coral) 18%, transparent);
		color: var(--coral);
	}
</style>
