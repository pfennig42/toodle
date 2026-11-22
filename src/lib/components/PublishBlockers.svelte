<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * What still keeps a draft from going public. For an unconfirmed e-mail address it offers the
	 * confirmation link right here (a magic link that leads back to this page).
	 */
	let { blockers, email }: { blockers: string[]; email: string } = $props();

	let verify = $state<'idle' | 'sending' | 'sent' | 'rate' | 'error'>('idle');
</script>

{#if blockers.includes('unverified')}
	<div class="verify small">
		<p class="error">{m.event_blocker_unverified({ email })}</p>
		{#if verify === 'sent'}
			<p role="status">{m.event_verify_sent({ email })}</p>
		{:else}
			<form
				method="post"
				action="/profile?/verifyEmail"
				use:enhance={() => {
					verify = 'sending';
					return ({ result }) => {
						verify =
							result.type === 'success'
								? 'sent'
								: result.type === 'failure' && result.status === 429
									? 'rate'
									: 'error';
					};
				}}
			>
				<input type="hidden" name="next" value={page.url.pathname} />
				<button class="btn small" disabled={verify === 'sending'}>{m.event_verify_send()}</button>
			</form>
			{#if verify === 'rate'}<p class="error" role="alert">{m.event_verify_rate()}</p>{/if}
			{#if verify === 'error'}<p class="error" role="alert">{m.event_verify_error()}</p>{/if}
		{/if}
	</div>
{/if}
{#if blockers.includes('location')}
	<p class="error small">{m.event_blocker_location()}</p>
{/if}
{#if blockers.includes('contact')}
	<p class="error small">{m.event_blocker_contact()}</p>
{/if}
{#if blockers.includes('past')}
	<p class="error small">{m.event_blocker_past()}</p>
{/if}

<style>
	.verify {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.verify p {
		margin: 0;
	}
</style>
