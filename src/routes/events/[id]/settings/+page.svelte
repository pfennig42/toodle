<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ev = $derived(data.event);
	const s = $derived(data.settings);
</script>

<div class="sections">
	<section class="stack">
		<h2>{m.settings_registration()}</h2>
		{#if ev.status === 'published'}
			<p class="muted small">
				{s.registrationClosed ? m.settings_registration_closed() : m.settings_registration_open()}
			</p>
			<form method="post" action="?/{s.registrationClosed ? 'reopen' : 'close'}" use:enhance>
				<button class="btn">{s.registrationClosed ? m.event_reopen() : m.event_close()}</button>
			</form>
		{:else}
			<p class="muted small">{m.settings_registration_not_published()}</p>
		{/if}
	</section>

	<section class="stack">
		<h2>{m.settings_visibility()}</h2>
		{#if ev.status === 'published'}
			<p class="muted small">{m.event_status_published_hint()}</p>
			<form method="post" action="?/unpublish" use:enhance>
				<button class="btn">{m.event_unpublish()}</button>
			</form>
		{:else if ev.status === 'draft'}
			<p class="muted small">{m.event_status_draft_hint()}</p>
			{#if s.blockers.includes('location')}
				<p class="error small">{m.event_blocker_location()}</p>
			{/if}
			{#if s.blockers.includes('contact')}
				<p class="error small">{m.event_blocker_contact()}</p>
			{/if}
			{#if s.blockers.includes('past')}
				<p class="error small">{m.event_blocker_past()}</p>
			{/if}
			<form method="post" action="?/publish" use:enhance>
				<button class="btn btn-primary" disabled={s.blockers.length > 0}>{m.event_publish()}</button
				>
			</form>
		{:else}
			<p class="muted small">{m.event_status_archived_hint()}</p>
		{/if}
		{#if form?.error === 'blocked'}<p class="error small">{m.event_blocker_generic()}</p>{/if}
	</section>

	<section class="stack">
		<h2>{m.settings_reuse()}</h2>
		<p class="muted small">{m.event_duplicate_hint()}</p>
		<div class="actions">
			<form method="post" action="?/duplicate">
				<button class="btn">{m.event_duplicate()}</button>
			</form>
			{#if ev.status === 'archived'}
				<form method="post" action="?/unarchive" use:enhance>
					<button class="btn">{m.event_unarchive()}</button>
				</form>
			{:else}
				<form method="post" action="?/archive" use:enhance>
					<button class="btn">{m.event_archive()}</button>
				</form>
			{/if}
		</div>
	</section>

	<section class="stack danger">
		<h2>{m.event_delete_title()}</h2>
		<p class="muted small">{m.event_delete_hint()}</p>
		<form method="post" action="?/delete" class="stack">
			<label class="field">
				<span>{m.event_delete_confirm({ title: ev.title })}</span>
				<input name="confirm" autocomplete="off" required />
			</label>
			{#if form?.error === 'confirm'}<p class="error small">{m.event_delete_mismatch()}</p>{/if}
			<div class="actions">
				<button class="btn btn-danger">{m.event_delete_submit()}</button>
			</div>
		</form>
	</section>
</div>

<style>
	/* plain sections separated by hairlines – settings, not a wall of cards */
	.sections > section {
		padding-block: var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.sections > section:first-child {
		padding-top: 0;
	}

	.sections > section:last-child {
		border-bottom: 0;
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	p {
		margin: 0;
	}

	.danger h2 {
		color: var(--danger);
	}
</style>
