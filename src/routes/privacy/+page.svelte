<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { legal } from '#lib/legal.js';
	import LegalText from '#lib/components/LegalText.svelte';
</script>

<LegalText page={legal('privacy', getLocale())} />
