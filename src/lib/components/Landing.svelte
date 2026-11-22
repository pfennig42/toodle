<script lang="ts">
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { landing } from '#lib/landing.js';

	/** What toodle does – shown on / when logged out. The personal part is on /about. */
	const t = $derived(landing(getLocale()).home);
</script>

<div class="landing">
	<section>
		<h1>{t.intro.title}</h1>
		<p class="lead">{t.intro.text}</p>
		<div class="cta">
			<a class="btn btn-primary" href={resolve('/events/new')}>{t.intro.cta}</a>
			<p class="muted small">{t.intro.note}</p>
		</div>
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
		<h2>{t.features.title}</h2>
		{#each t.features.groups as group, i (i)}
			<h3>{group.title}</h3>
			<ul class="plain">
				{#each group.items as item, j (j)}
					<li>{item}</li>
				{/each}
			</ul>
		{/each}
	</section>

	<section>
		<h2>{t.fit.title}</h2>
		<p>{t.fit.text}</p>
		<ul class="plain">
			{#each t.fit.items as item, i (i)}
				<li>{item}</li>
			{/each}
		</ul>
		<p>{t.fit.after}</p>
	</section>

	<section>
		<h2>{t.privacy.title}</h2>
		<ul class="plain">
			{#each t.privacy.items as item, i (i)}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<p class="article muted">
		{t.article.before}<a href="https://blog.pfennig.tech/toodle.html" rel="noopener"
			>{t.article.link}</a
		>{t.article.after}
	</p>
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
		font-size: clamp(1.7rem, 5vw, 2.2rem);
		line-height: 1.2;
	}

	h2 {
		margin: 0 0 var(--space-3);
		font-size: 1.25rem;
	}

	h3 {
		margin: var(--space-4) 0 var(--space-2);
		font-size: 1rem;
	}

	p {
		margin: 0 0 var(--space-3);
		line-height: 1.6;
	}

	section > :last-child {
		margin-bottom: 0;
	}

	.lead {
		font-size: 1.05rem;
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

	.plain {
		margin: 0 0 var(--space-3);
		padding: 0;
		list-style: none;
		display: grid;
		gap: var(--space-2);
		line-height: 1.5;
	}

	.plain li {
		position: relative;
		padding-left: 1.5rem;
	}

	.plain li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--accent);
		font-weight: 700;
	}

	.article {
		margin: 0;
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}
</style>
