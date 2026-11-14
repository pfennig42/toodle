<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	type Result = { address: string; area: string; lat: number; lon: number };

	let {
		value = $bindable<Result | null>(null),
		id = 'address'
	}: { value?: Result | null; id?: string } = $props();

	let query = $state('');
	let results = $state<Result[]>([]);
	let status = $state<'idle' | 'loading' | 'empty' | 'error'>('idle');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	function search() {
		clearTimeout(timer);
		const q = query.trim();
		if (q.length < 3) {
			results = [];
			status = 'idle';
			return;
		}
		timer = setTimeout(async () => {
			controller?.abort();
			controller = new AbortController();
			status = 'loading';
			try {
				const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
					signal: controller.signal
				});
				if (!res.ok) throw new Error(String(res.status));
				results = await res.json();
				status = results.length ? 'idle' : 'empty';
			} catch (err) {
				if ((err as Error).name !== 'AbortError') status = 'error';
			}
		}, 350);
	}

	/** On phones, move the field up so the results are not hidden behind the keyboard. */
	function revealOnPhones(event: FocusEvent) {
		const input = event.currentTarget as HTMLElement;
		if (!matchMedia('(max-width: 40rem)').matches) return;
		setTimeout(() => input.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
	}

	function choose(result: Result) {
		value = result;
		results = [];
		query = '';
	}
</script>

{#if value}
	<div class="chosen">
		<div>
			<div>{value.address}</div>
			<div class="muted small">{m.place_area_hint({ area: value.area })}</div>
		</div>
		<button type="button" class="btn small" onclick={() => (value = null)}>{m.change()}</button>
	</div>
	<input type="hidden" name="address" value={value.address} />
	<input type="hidden" name="area" value={value.area} />
	<input type="hidden" name="lat" value={value.lat} />
	<input type="hidden" name="lon" value={value.lon} />
{:else}
	<input
		{id}
		type="search"
		bind:value={query}
		oninput={search}
		onfocus={revealOnPhones}
		enterkeyhint="search"
		placeholder={m.place_search_placeholder()}
		autocomplete="off"
	/>
	{#if status === 'loading'}
		<p class="muted small">{m.place_search_loading()}</p>
	{:else if status === 'empty'}
		<p class="muted small">{m.place_search_empty()}</p>
	{:else if status === 'error'}
		<p class="error small">{m.place_search_error()}</p>
	{/if}
	{#if results.length}
		<ul class="results">
			{#each results as result (result.address)}
				<li>
					<button type="button" onclick={() => choose(result)}>
						<span>{result.address}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.chosen {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.results {
		list-style: none;
		margin: var(--space-1) 0 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.results li + li {
		border-top: 1px solid var(--border);
	}

	.results button {
		width: 100%;
		min-height: var(--touch);
		text-align: left;
		padding: var(--space-2) var(--space-3);
		border: 0;
		background: var(--surface);
		cursor: pointer;
	}

	.results button:hover,
	.results button:focus-visible {
		background: var(--accent-soft);
	}
</style>
