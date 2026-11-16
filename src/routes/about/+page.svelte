<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Landing from '#lib/components/Landing.svelte';
</script>

<svelte:head><title>{m.footer_about()} · {m.app_name()}</title></svelte:head>

<Landing />
