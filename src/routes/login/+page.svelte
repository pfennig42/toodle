<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);

	const errors = {
		email: m.login_error_email,
		credentials: m.login_error_credentials,
		rate: m.login_error_rate,
		mail: m.login_error_mail
	};
</script>

<svelte:head><title>{m.login_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow">
	{#if form?.sent}
		<h1>{m.login_sent_title()}</h1>
		<p>{m.login_sent_text({ email: form.sent })}</p>
		<p class="muted">{m.login_sent_hint()}</p>
		<form method="get">
			{#if data.next}<input type="hidden" name="next" value={data.next} />{/if}
			<button class="btn">{m.login_back()}</button>
		</form>
	{:else}
		<h1>{m.login_title()}</h1>
		<p class="muted">{m.login_intro()}</p>

		<form
			method="post"
			action="?/password"
			class="stack"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					await update({ reset: false });
					pending = false;
				};
			}}
		>
			<input type="hidden" name="next" value={data.next ?? ''} />
			<label class="field">
				<span>{m.field_email()}</span>
				<input
					type="email"
					name="email"
					autocomplete="username"
					required
					value={form && 'email' in form ? form.email : ''}
				/>
			</label>
			<label class="field">
				<span>{m.field_password()} <span class="muted">({m.optional()})</span></span>
				<input type="password" name="password" autocomplete="current-password" />
			</label>

			{#if form && 'error' in form && form.error}
				<p class="error" role="alert">{errors[form.error]()}</p>
			{/if}

			<div class="actions">
				<button class="btn btn-primary" disabled={pending}>{m.login_submit()}</button>
				<button class="btn" formaction="?/link" formnovalidate disabled={pending}
					>{m.login_send_link()}</button
				>
			</div>
			<p class="muted small">{m.login_hint()}</p>
		</form>
	{/if}
</section>
