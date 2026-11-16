<script lang="ts">
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { landing } from '#lib/landing.js';

	/** What toodle.lu is – shown on / when logged out and on /about. */
	const t = $derived(landing(getLocale()));
</script>

<div class="landing">
	<section class="hero">
		<h1>{t.hero.title}</h1>
		<p class="lead">{t.hero.text}</p>
		<div class="cta">
			<a class="btn btn-primary" href={resolve('/events/new')}>{t.hero.cta}</a>
			<p class="muted small">{t.hero.note}</p>
		</div>
	</section>

	<section class="why">
		<h2>{t.why.title}</h2>
		{#each t.why.paragraphs as p, i (i)}
			<p>{p}</p>
		{/each}
		<p class="sign">pfennig</p>
	</section>

	<section>
		<h2>{t.steps.title}</h2>
		<ol class="steps">
			{#each t.steps.items as step, i (i)}
				<li>
					<strong>{step.lead}</strong>
					{step.text}
				</li>
			{/each}
		</ol>
	</section>

	<section>
		<h2>{t.not.title}</h2>
		<ul class="nope">
			{#each t.not.items as item, i (i)}
				<li>{item}</li>
			{/each}
		</ul>
		<p>{t.not.after}</p>
	</section>

	<section>
		<h2>{t.orga.title}</h2>
		<ul class="plain">
			{#each t.orga.items as item, i (i)}
				<li>{item}</li>
			{/each}
		</ul>
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
		<p class="muted small links">
			<a href="https://pfennig.tech" rel="noopener">pfennig.tech</a>
			·
			<a href="https://chaos.social/@pfennig" rel="me noopener">@pfennig@chaos.social</a>
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
	.landing {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		max-width: 38rem;
		margin-inline: auto;
		padding-top: var(--space-4);
	}

	h1 {
		margin: 0 0 var(--space-4);
		font-size: clamp(1.9rem, 6vw, 2.6rem);
		line-height: 1.15;
		letter-spacing: -0.01em;
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

	.lead {
		font-size: 1.1rem;
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-top: var(--space-6);
	}

	.cta p {
		margin: 0;
	}

	/* --- the personal part */
	.why {
		padding-left: var(--space-4);
		border-left: 3px solid var(--accent);
	}

	.why p:not(.sign) {
		font-size: 1.05rem;
	}

	.sign {
		color: var(--text-muted);
		font-style: italic;
	}

	.steps {
		margin: 0;
		padding-left: 1.4rem;
		display: grid;
		gap: var(--space-3);
		line-height: 1.6;
	}

	.steps li::marker {
		color: var(--accent);
		font-weight: 700;
	}

	.nope,
	.plain {
		margin: 0 0 var(--space-3);
		padding: 0;
		list-style: none;
		display: grid;
		gap: var(--space-2);
		line-height: 1.5;
	}

	.nope li,
	.plain li {
		position: relative;
		padding-left: 1.5rem;
	}

	.nope li::before,
	.plain li::before {
		position: absolute;
		left: 0;
		color: var(--text-muted);
	}

	.nope li::before {
		content: '✕';
	}

	.plain li::before {
		content: '•';
		color: var(--accent);
		font-weight: 700;
	}

	.links {
		margin-top: var(--space-2);
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
