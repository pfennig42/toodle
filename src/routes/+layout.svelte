<script lang="ts">
	import '#lib/styles/global.css';
	import { asset, resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

<div class="shell">
	<header>
		<a class="brand" href={resolve('/')}>
			<img src={asset('icons/icon.svg')} alt="" width="28" height="28" />
			<span>{m.app_name()}</span>
		</a>
		<div class="tools">
			<LocaleSwitch />
			<ThemeToggle initial={data.theme} />
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="muted">{m.footer_note()}</footer>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: env(safe-area-inset-top, 0) var(--space-4) env(safe-area-inset-bottom, 0);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding-block: var(--space-4);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 700;
		font-size: 1.2rem;
		color: var(--text);
		text-decoration: none;
	}

	.tools {
		display: flex;
		gap: var(--space-2);
	}

	main {
		flex: 1;
		padding-block: var(--space-6);
	}

	footer {
		padding-block: var(--space-6);
		font-size: 0.85rem;
		text-align: center;
	}
</style>
