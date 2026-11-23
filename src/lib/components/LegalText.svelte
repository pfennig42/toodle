<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { linkify, type LegalPage } from '#lib/legal.js';

	let { page }: { page: LegalPage } = $props();
</script>

<svelte:head><title>{page.title} · {m.app_name()}</title></svelte:head>

<article class="legal">
	<h1>{page.title}</h1>
	{#if page.intro}<p class="intro">{page.intro}</p>{/if}
	{#each page.sections as section (section.heading)}
		<section>
			<h2>{section.heading}</h2>
			{#each section.paragraphs as paragraph, i (i)}
				<p>
					{#each linkify(paragraph) as part, j (j)}{#if part.href}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external: mailto: / https:// -->
							<a href={part.href} rel="noopener">{part.text}</a>{:else}{part.text}{/if}{/each}
				</p>
			{/each}
		</section>
	{/each}
	<p class="muted small">{page.updated}</p>
</article>

<style>
	.legal {
		max-width: 44rem;
		margin-inline: auto;
	}

	.intro {
		font-size: 1.05rem;
	}

	section {
		margin-top: var(--space-6);
	}

	p {
		line-height: 1.55;
	}
</style>
