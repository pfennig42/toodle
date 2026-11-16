<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Name and email at the top of the registration form: prefilled from the account and not
	 * editable here (they are not form answers). `example` fills them for the builder preview.
	 */
	let { example = false }: { example?: boolean } = $props();
	const user = $derived(page.data.user as { name: string | null; email: string } | null);
	const name = $derived(user?.name ?? (example ? 'Anna M.' : ''));
	const email = $derived(user?.email ?? (example ? 'anna@example.org' : ''));
</script>

<!--
	Shown as text, not as (read-only) inputs: they can't be changed here anyway, and password
	managers like Bitwarden attach themselves to name/email inputs – which broke hydration.
-->
<div class="account">
	<dl>
		<div class="field">
			<dt>{m.field_name()}</dt>
			<dd class="value">{name}</dd>
		</div>
		<div class="field">
			<dt>{m.field_email()}</dt>
			<dd class="value">{email}</dd>
		</div>
	</dl>
	<p class="muted small">
		{m.account_fields_hint()}
		{#if !example}<a href={resolve('/profile')}>{m.account_fields_change()}</a>{/if}
	</p>
</div>

<style>
	.account {
		display: grid;
		gap: var(--space-1);
	}

	dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-3);
		margin: 0;
	}

	p {
		margin: 0;
	}

	dt {
		font-weight: 500;
	}

	/* looks like a prefilled field, but is plain text */
	.value {
		margin: 0;
		padding: 0.6rem 0.75rem;
		min-height: var(--touch);
		display: flex;
		align-items: center;
		border-radius: var(--radius);
		background: var(--surface-2);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
</style>
