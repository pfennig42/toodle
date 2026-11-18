<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { GeoPoint } from '#lib/registration.js';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';
	import Icon from './Icon.svelte';

	type Spot = { lat: number; lon: number; label: string };

	/**
	 * Folded map below the places of a leg: the event and the chosen places. A click on the map
	 * looks up the address there and hands it to `onpick` – the search stays the main way.
	 * Leaflet is only loaded when the map is opened; tiles come through /api/tiles.
	 */
	let {
		event,
		spots,
		onpick,
		hint,
		canPick = true
	}: {
		event: Spot | null;
		spots: Spot[];
		onpick: (point: GeoPoint) => void;
		/** What a click does, e.g. "Tap the map to add a place." */
		hint: string;
		canPick?: boolean;
	} = $props();

	let open = $state(false);
	let el = $state<HTMLDivElement>();
	let map = $state<LeafletMap>();
	let layer: LayerGroup | undefined;
	let observer: ResizeObserver | undefined;
	let L: typeof import('leaflet') | undefined;
	let status = $state<'idle' | 'loading' | 'none' | 'error'>('idle');

	const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

	async function init() {
		if (map || !el) return;
		L = (await import('leaflet')).default;
		await import('leaflet/dist/leaflet.css');
		if (!el || map) return;
		const center = event ?? spots[0];
		const created = L.map(el, { zoomControl: true, attributionControl: true }).setView(
			center ? [center.lat, center.lon] : [50.5, 9],
			center ? 11 : 5
		);
		created.attributionControl.setPrefix(false);
		L.tileLayer('/api/tiles/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution:
				'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
		}).addTo(created);
		created.on('click', (e) => pick(e.latlng.lat, e.latlng.lng));
		layer = L.layerGroup().addTo(created);
		map = created;
		fit(true);
		// the box may still be growing (opening, styles arriving): keep the view on the places
		let lastHeight = el.clientHeight;
		observer = new ResizeObserver(() => {
			if (!map || !el) return;
			map.invalidateSize();
			if (el.clientHeight !== lastHeight) fit(true);
			lastHeight = el.clientHeight;
		});
		observer.observe(el);
	}

	/** Shows everything – on a change only if something new is out of view. */
	function fit(always = false) {
		if (!map || !L) return;
		const all = [...(event ? [event] : []), ...spots].map((s) => L!.latLng(s.lat, s.lon));
		if (!all.length) return;
		const bounds = L.latLngBounds(all);
		if (!always && map.getBounds().contains(bounds)) return;
		map.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
	}

	$effect(() => {
		if (open) {
			// the box only has its size once it's open
			requestAnimationFrame(() => (map ? map.invalidateSize() : init()));
		}
	});

	$effect(() => {
		const current = [event, ...spots];
		if (!map || !L || !layer) return;
		layer.clearLayers();
		if (event) {
			L.marker([event.lat, event.lon], {
				icon: L.divIcon({
					className: 'toodle-pin event',
					html: '<b><span>★</span></b>',
					iconSize: [30, 30],
					// the tip of the turned drop: centre + half the diagonal
					iconAnchor: [15, 36]
				}),
				title: event.label,
				keyboard: false
			})
				.bindTooltip(escape(event.label))
				.addTo(layer);
		}
		spots.forEach((s, i) => {
			L!
				.marker([s.lat, s.lon], {
					icon: L!.divIcon({
						className: 'toodle-pin spot',
						html: `<b><span>${i + 1}</span></b>`,
						iconSize: [26, 26],
						iconAnchor: [13, 31]
					}),
					title: s.label,
					keyboard: false
				})
				.bindTooltip(escape(s.label))
				.addTo(layer!);
		});
		if (current.length) fit();
	});

	let controller: AbortController | undefined;
	async function pick(lat: number, lon: number) {
		if (!canPick) return;
		controller?.abort();
		controller = new AbortController();
		status = 'loading';
		try {
			const res = await fetch(`/api/geocode?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`, {
				signal: controller.signal
			});
			if (!res.ok) throw new Error(String(res.status));
			const [hit] = (await res.json()) as GeoPoint[];
			if (!hit) {
				status = 'none';
				return;
			}
			status = 'idle';
			onpick(hit);
		} catch (err) {
			if ((err as Error).name !== 'AbortError') status = 'error';
		}
	}

	$effect(() => () => {
		controller?.abort();
		observer?.disconnect();
		map?.remove();
	});
</script>

<details class="map" bind:open>
	<summary><Icon name="pin" size={18} />{open ? m.map_hide() : m.map_show()}</summary>
	<div class="canvas" bind:this={el}></div>
	<p class="small muted hint" aria-live="polite">
		{#if status === 'loading'}
			{m.map_looking_up()}
		{:else if status === 'none'}
			{m.map_nothing_there()}
		{:else if status === 'error'}
			{m.place_search_error()}
		{:else}
			<span class="legend"><span class="dot event">★</span>{event?.label ?? ''}</span>
			· {hint}
		{/if}
	</p>
</details>

<style>
	.map summary {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch);
		color: var(--accent);
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}

	.map summary::-webkit-details-marker {
		display: none;
	}

	.map summary :global(svg) {
		color: var(--text-muted);
	}

	.canvas {
		height: min(22rem, 60vh);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		/* above the page, below sticky bars */
		z-index: 0;
		position: relative;
		cursor: crosshair;
	}

	.hint {
		margin: var(--space-2) 0 0;
	}

	.legend {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.dot.event {
		color: var(--cta);
	}

	.canvas :global(.leaflet-container) {
		font: inherit;
	}

	/* Leaflet places the marker with `transform` – the drop is turned inside it */
	.canvas :global(.toodle-pin b) {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		border-radius: 50% 50% 50% 0;
		rotate: -45deg;
		border: 2px solid #fff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
		color: #fff;
		font-weight: 700;
		font-size: 0.8rem;
	}

	.canvas :global(.toodle-pin span) {
		rotate: 45deg;
	}

	.canvas :global(.toodle-pin.event b) {
		background: var(--cta);
		font-size: 0.95rem;
	}

	.canvas :global(.toodle-pin.spot b) {
		background: #2f6b4f;
	}
</style>
