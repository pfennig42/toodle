<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
</script>

{#if page.url.searchParams.has('deleted')}
	<p class="card notice" role="status">{m.home_deleted()}</p>
{/if}

<section class="card">
	<h1>{m.app_tagline()}</h1>
	<p>{m.home_intro()}</p>
	<p class="muted">{m.home_coming_soon()}</p>
</section>

<style>
	.notice {
		margin-bottom: var(--space-4);
		padding: var(--space-4);
	}
</style>
