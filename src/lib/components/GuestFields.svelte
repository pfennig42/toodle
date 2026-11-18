<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Name and e-mail of a guest (registering without logging in) – at the very end of the
	 * registration form, after everything that is about the event itself.
	 */
	let {
		name = '',
		email = '',
		errors = {}
	}: {
		name?: string;
		email?: string;
		errors?: { name?: boolean; email?: boolean };
	} = $props();

	// bind:value keeps what was typed before hydration (slow networks)
	// svelte-ignore state_referenced_locally
	let nameValue = $state(name);
	// svelte-ignore state_referenced_locally
	let emailValue = $state(email);
</script>

<div class="guest" role="group" aria-labelledby="guest-title">
	<h3 id="guest-title">{m.guest_title()}</h3>
	<p class="muted small">{m.guest_hint()}</p>
	<!-- errors outside the labels, so they don't become part of the field's name -->
	<div class="field">
		<label for="guest-name">{m.field_name()}</label>
		<input
			id="guest-name"
			name="guestName"
			autocomplete="name"
			maxlength="80"
			required
			bind:value={nameValue}
			aria-invalid={errors.name ? 'true' : undefined}
			aria-describedby={errors.name ? 'guest-name-error' : undefined}
		/>
		{#if errors.name}
			<span id="guest-name-error" class="error small">{m.guest_error_name()}</span>
		{/if}
	</div>
	<div class="field">
		<label for="guest-email">{m.field_email()}</label>
		<input
			id="guest-email"
			type="email"
			name="guestEmail"
			autocomplete="email"
			inputmode="email"
			required
			bind:value={emailValue}
			aria-invalid={errors.email ? 'true' : undefined}
			aria-describedby={errors.email ? 'guest-email-error' : undefined}
		/>
		{#if errors.email}
			<span id="guest-email-error" class="error small">{m.guest_error_email()}</span>
		{/if}
	</div>
</div>

<style>
	/* set apart like the travel section: this is about you, not the event */
	.guest {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-4);
		margin-inline: calc(-1 * var(--space-2));
		border-radius: var(--radius);
		background: var(--bg);
	}

	h3 {
		margin: 0;
		font-size: 1.05rem;
	}

	p {
		margin: -0.5rem 0 0;
	}
</style>
