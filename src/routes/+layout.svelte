<script lang="ts">
	import '#lib/styles/global.css';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from '#lib/components/Icon.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Marker for end-to-end tests (and CSS, if ever needed): the app is interactive now.
	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});

	const isActive = (path: string) =>
		path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(path);
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

<div class="shell" class:has-bottom-nav={!!data.user}>
	<header>
		<a class="brand" href={resolve('/')}>
			<img src={asset('icons/favicon.svg')} alt="" width="32" height="32" />
			<span>{m.app_name()}</span>
		</a>

		<div class="tools">
			{#if data.user}
				<nav class="top-nav" aria-label={m.nav_main()}>
					<a href={resolve('/')} aria-current={isActive('/') ? 'page' : undefined}>{m.nav_home()}</a
					>
					<a href={resolve('/profile')} aria-current={isActive('/profile') ? 'page' : undefined}
						>{m.nav_profile()}</a
					>
				</nav>
			{:else if !isActive('/login')}
				<a class="btn" href={resolve('/login')}>{m.login_title()}</a>
			{/if}
			<button
				type="button"
				class="btn icon-btn"
				popovertarget="settings"
				aria-label={m.settings_title()}
				title={m.settings_title()}
			>
				<Icon name="settings" />
			</button>
		</div>
	</header>

	<div id="settings" popover class="settings">
		<h2>{m.settings_title()}</h2>
		<div class="field">
			<span>{m.nav_language()}</span>
			<LocaleSwitch />
		</div>
		<div class="field">
			<span>{m.theme_label()}</span>
			<ThemeToggle initial={data.theme} />
		</div>
	</div>

	<main>
		{@render children()}
	</main>

	<footer class="muted">{m.footer_note()}</footer>
</div>

{#if data.user}
	<nav class="bottom-nav" aria-label={m.nav_main()}>
		<a href={resolve('/')} aria-current={isActive('/') ? 'page' : undefined}>
			<Icon name="home" />
			<span>{m.nav_home()}</span>
		</a>
		<a href={resolve('/profile')} aria-current={isActive('/profile') ? 'page' : undefined}>
			<Icon name="user" />
			<span>{m.nav_profile()}</span>
		</a>
	</nav>
{/if}

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
		gap: var(--space-3);
		padding-block: var(--space-3);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch);
		font-weight: 700;
		font-size: 1.2rem;
		color: var(--text);
		text-decoration: none;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.icon-btn {
		padding: 0;
		width: var(--touch);
		justify-content: center;
	}

	.top-nav {
		display: flex;
		gap: var(--space-1);
	}

	.top-nav a {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding-inline: var(--space-3);
		border-radius: var(--radius);
		color: var(--text-muted);
		text-decoration: none;
	}

	.top-nav a:hover {
		background: var(--surface-2);
	}

	.top-nav a[aria-current='page'] {
		color: var(--text);
		font-weight: 600;
	}

	.settings {
		/* Popover: top layer, light dismiss. Placed below the header, right aligned. */
		position: fixed;
		inset: auto;
		top: calc(env(safe-area-inset-top, 0px) + 4.25rem);
		right: max(var(--space-4), calc((100vw - var(--content-width)) / 2 + var(--space-4)));
		width: min(20rem, calc(100vw - 2 * var(--space-4)));
		margin: 0;
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		box-shadow: 0 8px 30px rgb(0 0 0 / 0.18);
		flex-direction: column;
		gap: var(--space-4);
	}

	.settings:popover-open {
		display: flex;
	}

	.settings h2 {
		margin: 0;
		font-size: 1rem;
	}

	main {
		flex: 1;
		padding-block: var(--space-4) var(--space-6);
	}

	footer {
		padding-block: var(--space-6);
		font-size: 0.85rem;
		text-align: center;
	}

	.bottom-nav {
		display: none;
	}

	@media (max-width: 40rem) {
		.top-nav {
			display: none;
		}

		.has-bottom-nav footer {
			padding-bottom: calc(var(--bottom-nav-height) + var(--space-6));
		}

		.bottom-nav {
			position: fixed;
			inset: auto 0 0 0;
			z-index: 10;
			display: flex;
			justify-content: space-around;
			padding-bottom: env(safe-area-inset-bottom, 0);
			background: var(--surface);
			border-top: 1px solid var(--border);
		}

		.bottom-nav a {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 2px;
			height: var(--bottom-nav-height);
			color: var(--text-muted);
			text-decoration: none;
			font-size: 0.75rem;
		}

		.bottom-nav a[aria-current='page'] {
			color: var(--accent);
			font-weight: 600;
		}

		/* While typing, the on-screen keyboard needs the space. */
		:global(:root:has(input:focus, select:focus, textarea:focus)) .bottom-nav {
			display: none;
		}
	}
</style>
