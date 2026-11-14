<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatDateTime, formatRange } from '#lib/datetime.js';
	import { addressWithoutName } from '#lib/location.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ev = $derived(data.event);
	const o = $derived(data.overview);
	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(ev.publicUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard not available – the link is selectable anyway */
		}
	}

	async function share() {
		if (navigator.share) {
			await navigator.share({ title: ev.title, url: ev.publicUrl }).catch(() => {});
		} else {
			await copyLink();
		}
	}
</script>

<div class="stack-lg">
	{#if data.created}
		<p class="card notice" role="status">{m.event_created_notice()}</p>
	{/if}

	<section class="card stack">
		<div>
			<p class="small muted label">{m.event_when()}</p>
			<p>{formatRange(o.startsAt, o.endsAt, o.timezone, getLocale())}</p>
		</div>
		{#if o.locationName || o.locationAddress}
			<div>
				<p class="small muted label">{m.event_where()}</p>
				<p>
					{[o.locationName, addressWithoutName(o.locationName, o.locationAddress)]
						.filter(Boolean)
						.join(' · ')}
				</p>
			</div>
		{/if}
		<div>
			<p class="small muted label">{m.event_registration()}</p>
			<p>
				{o.registrationDeadline
					? m.event_deadline_until({
							date: formatDateTime(o.registrationDeadline, o.timezone, getLocale())
						})
					: m.event_no_deadline()}
				{#if o.capacity}· {m.event_capacity_value({ count: o.capacity })}{/if}
			</p>
			<p class="count">
				{m.event_registration_count({ count: o.registrations })}{o.capacity
					? ` / ${o.capacity}`
					: ''}
			</p>
		</div>
		<a class="btn small align-start" href={resolve('/events/[id]/details', { id: ev.id })}
			>{m.edit()}</a
		>
	</section>

	<section class="card stack">
		<h2>{m.event_share_title()}</h2>
		{#if ev.status === 'draft'}
			<p class="muted small">{m.event_share_draft_hint()}</p>
		{/if}
		<div class="link-row">
			<input
				readonly
				value={ev.publicUrl}
				aria-label={m.event_public_link()}
				onfocus={(e) => e.currentTarget.select()}
			/>
			<button type="button" class="btn" onclick={copyLink}>{copied ? m.copied() : m.copy()}</button>
		</div>
		<div class="actions">
			<button type="button" class="btn" onclick={share}>{m.share()}</button>
			<a class="btn" href={resolve('/e/[slug]', { slug: ev.slug })}>{m.event_view_public()}</a>
		</div>
		<details>
			<summary>{m.event_qr()}</summary>
			<div class="qr">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated server-side from our own URL -->
				{@html data.qr}
			</div>
		</details>
	</section>

	<section class="card stack">
		<h2>{m.event_status_title()}</h2>
		{#if ev.status === 'draft'}
			<p class="muted small">{m.event_status_draft_hint()}</p>
			{#if o.blockers.includes('location')}
				<p class="error small">{m.event_blocker_location()}</p>
			{/if}
			{#if o.blockers.includes('past')}
				<p class="error small">{m.event_blocker_past()}</p>
			{/if}
			<form method="post" action="?/publish" use:enhance>
				<button class="btn btn-primary" disabled={o.blockers.length > 0}>{m.event_publish()}</button
				>
			</form>
		{:else if ev.status === 'published'}
			<p class="muted small">{m.event_status_published_hint()}</p>
			<div class="actions">
				{#if o.registrationClosed}
					<form method="post" action="?/reopen" use:enhance>
						<button class="btn">{m.event_reopen()}</button>
					</form>
				{:else}
					<form method="post" action="?/close" use:enhance>
						<button class="btn">{m.event_close()}</button>
					</form>
				{/if}
				<form method="post" action="?/unpublish" use:enhance>
					<button class="btn">{m.event_unpublish()}</button>
				</form>
			</div>
		{:else}
			<p class="muted small">{m.event_status_archived_hint()}</p>
		{/if}
		{#if form?.error === 'blocked'}<p class="error small">{m.event_blocker_generic()}</p>{/if}
	</section>

	<section class="card stack">
		<h2>{m.event_more_title()}</h2>
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
		<p class="muted small">{m.event_duplicate_hint()}</p>
	</section>

	<section class="card stack danger-zone">
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
	.notice {
		padding: var(--space-4);
		background: var(--accent-soft);
		border-color: transparent;
	}

	.label {
		margin: 0;
	}

	.card p:not(.small) {
		margin: 0;
	}

	h2 {
		margin: 0;
	}

	.count {
		margin-top: var(--space-1) !important;
		font-weight: 600;
	}

	.align-start {
		align-self: flex-start;
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

	.qr {
		max-width: 16rem;
		margin-top: var(--space-3);
		padding: var(--space-3);
		background: #fff;
		border-radius: var(--radius);
	}

	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	summary {
		cursor: pointer;
		min-height: var(--touch);
		display: flex;
		align-items: center;
	}
</style>
