<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	/** The public link – copy, share (native share sheet on phones), QR code for print. */
	let { url, slug, title, qr }: { url: string; slug: string; title: string; qr: string } = $props();

	let copied = $state(false);
	let showQr = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard not available – the link is selectable anyway */
		}
	}

	async function share() {
		if (navigator.share) {
			await navigator.share({ title, url }).catch(() => {});
		} else {
			await copy();
		}
	}
</script>

<div class="share stack">
	<div class="link-row">
		<input
			readonly
			value={url}
			aria-label={m.event_public_link()}
			onfocus={(e) => e.currentTarget.select()}
		/>
		<button type="button" class="btn" onclick={copy}>{copied ? m.copied() : m.copy()}</button>
	</div>
	<div class="actions">
		<button type="button" class="btn btn-primary" onclick={share}>{m.share_invite()}</button>
		<button type="button" class="btn" aria-expanded={showQr} onclick={() => (showQr = !showQr)}
			>{m.event_qr()}</button
		>
		<a class="link" href={resolve('/e/[slug]', { slug })}>{m.event_view_public()}</a>
	</div>
	{#if showQr}
		<div class="qr">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated server-side from our own URL -->
			{@html qr}
		</div>
	{/if}
</div>

<style>
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

	.actions {
		align-items: center;
	}

	.link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding-inline: var(--space-1);
	}

	.qr {
		max-width: 14rem;
		padding: var(--space-3);
		background: #fff;
		border-radius: var(--radius);
	}

	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
