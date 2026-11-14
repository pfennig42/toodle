<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<section class="card narrow stack">
	{#if data.title && !form?.invalid}
		<h1>{m.invite_title()}</h1>
		<p>{m.invite_text({ title: data.title })}</p>
		<form method="post">
			<button class="btn btn-primary">{m.invite_accept()}</button>
		</form>
	{:else}
		<h1>{m.invite_invalid_title()}</h1>
		<p class="muted">{m.invite_invalid_text()}</p>
		<a class="btn" href={resolve('/')}>{m.error_back_home()}</a>
	{/if}
</section>
