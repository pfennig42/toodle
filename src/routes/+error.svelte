<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head><title>{page.status} · {m.app_name()}</title></svelte:head>

<section class="card narrow">
	<h1>{page.status === 404 ? m.error_404_title() : m.error_generic_title()}</h1>
	<p class="muted">{page.status === 404 ? m.error_404_text() : m.error_generic_text()}</p>
	<a class="btn btn-primary" href={resolve('/')}>{m.error_back_home()}</a>
</section>
