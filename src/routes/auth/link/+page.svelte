<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.login_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow">
	{#if data.valid && !form?.invalid}
		<h1>{m.link_title()}</h1>
		<p>{m.link_text()}</p>
		<form method="post">
			<input type="hidden" name="token" value={data.token} />
			<button class="btn btn-primary">{m.link_submit()}</button>
		</form>
	{:else}
		<h1>{m.link_invalid_title()}</h1>
		<p>{m.link_invalid_text()}</p>
		<a class="btn btn-primary" href={resolve('/login')}>{m.link_request_new()}</a>
	{/if}
</section>
