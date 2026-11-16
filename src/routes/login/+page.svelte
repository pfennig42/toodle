<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	/** Where to go after login. Action results carry it too: after an enhanced action the
	 * URL can lose its `?next=` – and with it `data.next`. */
	const next = $derived((form && 'next' in form ? form.next : null) ?? data.next);
	let pending = $state(false);
	// bind:value keeps input typed before hydration (slow networks)
	// svelte-ignore state_referenced_locally
	let email = $state(form && 'email' in form ? (form.email ?? '') : '');
	let passwordInput = $state<HTMLInputElement | null>(null);

	const errors = {
		email: m.login_error_email,
		credentials: m.login_error_credentials,
		rate: m.login_error_rate,
		mail: m.login_error_mail
	};

	const step = $derived(form && 'step' in form && form.step === 'password' ? 'password' : 'email');
	const accountEmail = $derived(form && 'email' in form ? (form.email ?? '') : '');
	const error = $derived(form && 'error' in form && form.error ? errors[form.error]() : null);

	// Jump straight into the password field once we know the account has one.
	$effect(() => {
		if (step === 'password') passwordInput?.focus();
	});

	const submit = () => {
		pending = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending = false;
		};
	};
</script>

<svelte:head><title>{m.login_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow stack">
	{#if form && 'sent' in form && form.sent}
		<h1>{m.login_sent_title()}</h1>
		<p>{m.login_sent_text({ email: form.sent })}</p>
		<p class="muted">{m.login_sent_hint()}</p>
		<p class="muted small">{m.login_sent_password_tip()}</p>
		<form method="get">
			{#if next}<input type="hidden" name="next" value={next} />{/if}
			<button class="btn">{m.login_other_email()}</button>
		</form>
	{:else if step === 'password'}
		<h1>{m.login_title()}</h1>
		<form method="get" class="who">
			{#if next}<input type="hidden" name="next" value={next} />{/if}
			<span class="address">{accountEmail}</span>
			<button class="btn small">{m.login_change_email()}</button>
		</form>

		<form method="post" action="?/password" class="stack" use:enhance={submit}>
			<input type="hidden" name="next" value={next ?? ''} />
			<!-- for password managers: they pair the password with this username -->
			<input
				class="visually-hidden"
				type="email"
				name="email"
				autocomplete="username"
				value={accountEmail}
				readonly
				tabindex="-1"
				aria-hidden="true"
			/>
			<label class="field">
				<span>{m.field_password()}</span>
				<input
					bind:this={passwordInput}
					type="password"
					name="password"
					autocomplete="current-password"
					required
				/>
			</label>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<button class="btn btn-primary" disabled={pending}>{m.login_submit()}</button>
		</form>

		<form method="post" action="?/link" class="alt" use:enhance={submit}>
			<input type="hidden" name="next" value={next ?? ''} />
			<input type="hidden" name="email" value={accountEmail} />
			<button class="link-btn" disabled={pending}>{m.login_use_link()}</button>
			<span class="muted small">{m.login_forgot_hint()}</span>
		</form>
	{:else}
		<h1>{m.login_title()}</h1>
		<p class="muted">{m.login_intro()}</p>

		<form method="post" action="?/email" class="stack" use:enhance={submit}>
			<input type="hidden" name="next" value={next ?? ''} />
			<label class="field">
				<span>{m.field_email()}</span>
				<input
					type="email"
					name="email"
					autocomplete="username"
					inputmode="email"
					required
					bind:value={email}
				/>
			</label>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<button class="btn btn-primary" disabled={pending}>{m.login_continue()}</button>
		</form>
	{/if}
</section>

<style>
	h1 {
		margin: 0;
	}

	.who {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.address {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.alt {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
	}

	.btn-primary {
		align-self: flex-start;
	}
</style>
