<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { landing } from '#lib/landing.js';

	/** Who builds toodle and why – the start page only describes what it does. */
	const t = $derived(landing(getLocale()).about);
</script>

<svelte:head><title>{m.footer_about()} · {m.app_name()}</title></svelte:head>

<div class="about">
	<section>
		<h1>{t.title}</h1>
		<p>{t.intro}</p>
		<p>
			{t.article.before}<a href="https://blog.pfennig.tech/toodle.html" rel="noopener"
				>{t.article.link}</a
			>{t.article.after}
		</p>
		<p>{t.feedback}</p>
		<p class="muted small">
			<a href="https://pfennig.tech" rel="noopener">pfennig.tech</a>
			·
			<a href="https://chaos.social/@pfennig" rel="me noopener">@pfennig@chaos.social</a>
		</p>
	</section>

	<section>
		<h2>{t.costs.title}</h2>
		<p>
			{t.costs.before}<a href="https://pfennig.tech" rel="noopener">pfennig</a>{t.costs.after}
		</p>
		<p>
			{t.costs.coffee}
			<a href="https://buymeacoffee.com/pfennig42" rel="noopener">buymeacoffee.com/pfennig42</a>
		</p>
	</section>

	<section>
		<h2>{t.faq.title}</h2>
		<dl class="faq">
			{#each t.faq.items as item, i (i)}
				<div>
					<dt>{item.q}</dt>
					<dd>{item.a}</dd>
				</div>
			{/each}
		</dl>
	</section>
</div>

<style>
	.about {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		max-width: 38rem;
		margin-inline: auto;
		padding-top: var(--space-4);
	}

	h1 {
		margin: 0 0 var(--space-4);
		font-size: clamp(1.7rem, 5vw, 2.2rem);
		line-height: 1.2;
	}

	h2 {
		margin: 0 0 var(--space-3);
		font-size: 1.25rem;
	}

	p {
		margin: 0 0 var(--space-3);
		line-height: 1.6;
	}

	section > :last-child {
		margin-bottom: 0;
	}

	.faq {
		margin: 0;
		display: grid;
		gap: var(--space-4);
	}

	.faq dt {
		font-weight: 600;
		margin-bottom: var(--space-1);
	}

	.faq dd {
		margin: 0;
		line-height: 1.6;
	}
</style>
