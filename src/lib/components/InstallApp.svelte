<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';

	type InstallPrompt = Event & { prompt: () => Promise<void> };

	let promptEvent = $state<InstallPrompt | null>(null);
	let installed = $state(false);
	let ios = $state(false);

	onMount(() => {
		installed =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		// Safari on iPhone/iPad has no install prompt – people use "Add to Home Screen".
		ios =
			/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

		const onPrompt = (e: Event) => {
			e.preventDefault();
			promptEvent = e as InstallPrompt;
		};
		const onInstalled = () => {
			installed = true;
			promptEvent = null;
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});

	async function install() {
		if (!promptEvent) return;
		await promptEvent.prompt();
		promptEvent = null;
	}
</script>

{#if !installed && (promptEvent || ios)}
	<div class="field">
		<span>{m.install_title()}</span>
		{#if promptEvent}
			<button type="button" class="btn" onclick={install}>{m.install_button()}</button>
			<span class="muted small">{m.install_hint()}</span>
		{:else}
			<span class="muted small">{m.install_ios()}</span>
		{/if}
	</div>
{/if}
