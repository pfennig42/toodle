<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let copied = $state(false);

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* ignore */
		}
	}
</script>

<div class="stack-lg">
	<section class="card">
		<h2>{m.team_title()}</h2>
		<p class="muted small">{m.team_hint()}</p>
		<ul class="list">
			{#each data.team as member (member.id)}
				<li>
					<span>
						<strong>{member.name ?? member.email}</strong>
						<span class="muted small">{member.email}</span>
					</span>
					{#if data.team.length > 1}
						<form method="post" action="?/remove" use:enhance>
							<input type="hidden" name="userId" value={member.id} />
							<button class="btn small">{m.remove()}</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		{#if form?.error === 'last'}<p class="error small">{m.team_error_last()}</p>{/if}
	</section>

	<section class="card stack">
		<h2>{m.team_invite_title()}</h2>
		<p class="muted small">{m.team_invite_hint()}</p>
		{#if form?.inviteUrl}
			<div class="link-row">
				<input
					readonly
					value={form.inviteUrl}
					aria-label={m.team_invite_title()}
					onfocus={(e) => e.currentTarget.select()}
				/>
				<button type="button" class="btn" onclick={() => copy(form.inviteUrl)}
					>{copied ? m.copied() : m.copy()}</button
				>
			</div>
			<p class="muted small">{m.team_invite_once()}</p>
		{:else}
			<form method="post" action="?/invite" use:enhance>
				<button class="btn btn-primary">{m.team_invite_create()}</button>
			</form>
		{/if}
		{#if data.pendingInvites}
			<p class="muted small">{m.team_invite_pending({ count: data.pendingInvites })}</p>
		{/if}
	</section>
</div>

<style>
	h2 {
		margin-bottom: var(--space-2);
	}

	.link-row {
		display: flex;
		gap: var(--space-2);
	}

	.link-row input {
		flex: 1;
		min-width: 0;
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}
</style>
