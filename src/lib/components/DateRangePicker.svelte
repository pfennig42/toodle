<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import {
		addDays,
		addMonths,
		formatDateRange,
		formatLongDate,
		formatMonth,
		inRange,
		isIsoDate,
		monthGrid,
		monthOf,
		pickDate,
		weekdayNames,
		type RangePhase
	} from '#lib/date-range.js';

	/**
	 * Hotel-style range picker: one field, one calendar – first click = first day, second click =
	 * last day. Posts the two dates as hidden inputs, so the server sees the same form as without
	 * JavaScript (the form shows plain date inputs until hydration).
	 */
	let {
		start = $bindable(''),
		end = $bindable(''),
		label,
		id = 'date-range',
		startName = 'startDate',
		endName = 'endDate',
		invalid = false
	}: {
		start?: string;
		end?: string;
		label: string;
		id?: string;
		startName?: string;
		endName?: string;
		invalid?: boolean;
	} = $props();

	const locale = getLocale();
	const weekdays = weekdayNames(locale);
	const now = new Date();
	const today = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, '0'),
		String(now.getDate()).padStart(2, '0')
	].join('-');

	let open = $state(false);
	let phase = $state<RangePhase>('start');
	let month = $state(monthOf(isIsoDate(start) ? start : today));
	let focusDate = $state(isIsoDate(start) ? start : today);
	let hover = $state('');
	let root = $state<HTMLElement>();
	let trigger = $state<HTMLButtonElement>();

	const range = $derived({ start, end });
	const hasRange = $derived(isIsoDate(start));
	const weeks = $derived(monthGrid(month));
	// the one day reachable with Tab (roving tabindex)
	const tabDate = $derived(monthOf(focusDate) === month ? focusDate : month + '-01');

	async function show() {
		const anchor = isIsoDate(start) ? start : today;
		phase = 'start';
		month = monthOf(anchor);
		focusDate = anchor;
		open = true;
		await tick();
		focusDay();
	}

	function close(returnFocus = true) {
		open = false;
		hover = '';
		if (returnFocus) trigger?.focus();
	}

	function pick(date: string) {
		const next = pickDate(range, phase, date);
		start = next.range.start;
		end = next.range.end;
		phase = next.phase;
		focusDate = date;
		if (next.done) close();
	}

	function focusDay() {
		root?.querySelector<HTMLButtonElement>(`[data-date="${tabDate}"]`)?.focus();
	}

	async function moveTo(date: string) {
		focusDate = date;
		month = monthOf(date);
		if (phase === 'end') hover = date;
		await tick();
		focusDay();
	}

	function shiftMonth(by: number) {
		month = monthOf(addMonths(month + '-01', by));
	}

	const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

	function onDayKey(e: KeyboardEvent, date: string) {
		if (e.key in STEPS) moveTo(addDays(date, STEPS[e.key]));
		else if (e.key === 'PageUp') moveTo(addMonths(date, -1));
		else if (e.key === 'PageDown') moveTo(addMonths(date, 1));
		else return;
		e.preventDefault();
	}

	function onPanelKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	// A tap/click elsewhere closes the calendar (the range picked so far stays).
	$effect(() => {
		if (!open) return;
		const away = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) close(false);
		};
		document.addEventListener('pointerdown', away);
		return () => document.removeEventListener('pointerdown', away);
	});
</script>

<div class="range" bind:this={root}>
	<input type="hidden" name={startName} value={start} />
	<input type="hidden" name={endName} value={end} />
	<span class="label" id="{id}-label">{label}</span>
	<button
		type="button"
		class="trigger"
		class:invalid
		bind:this={trigger}
		aria-expanded={open}
		aria-controls="{id}-panel"
		aria-labelledby="{id}-label {id}-value"
		onclick={() => (open ? close() : show())}
	>
		<span id="{id}-value" class:placeholder={!hasRange}>
			{hasRange ? formatDateRange(range, locale) : m.range_choose()}
		</span>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<rect x="3.5" y="5" width="17" height="15" rx="2" />
			<path d="M3.5 10h17M8 3v4M16 3v4" />
		</svg>
	</button>

	{#if open}
		<div
			class="panel"
			id="{id}-panel"
			role="dialog"
			aria-label={label}
			tabindex="-1"
			onkeydown={onPanelKey}
			onpointerleave={() => (hover = '')}
		>
			<div class="head">
				<button
					type="button"
					class="nav"
					aria-label={m.range_prev_month()}
					onclick={() => shiftMonth(-1)}>‹</button
				>
				<span class="month" aria-live="polite">{formatMonth(month, locale)}</span>
				<button
					type="button"
					class="nav"
					aria-label={m.range_next_month()}
					onclick={() => shiftMonth(1)}>›</button
				>
			</div>
			<p class="muted small step" aria-live="polite">
				{phase === 'start' ? m.range_pick_start() : m.range_pick_end()}
			</p>
			<table>
				<thead>
					<tr>
						{#each weekdays as day (day)}
							<th scope="col" class="muted small">{day}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each weeks as week, w (w)}
						<tr>
							{#each week as day, d (d)}
								<td>
									{#if day}
										{@const isStart = day === start}
										{@const isEnd = day === (phase === 'end' && hover >= start ? hover : end)}
										<button
											type="button"
											class="day"
											class:between={inRange(day, range, phase === 'end' ? hover : '')}
											class:start={isStart}
											class:end={isEnd}
											class:today={day === today}
											data-date={day}
											tabindex={day === tabDate ? 0 : -1}
											aria-label={formatLongDate(day, locale)}
											aria-pressed={inRange(day, range)}
											aria-current={day === today ? 'date' : undefined}
											onclick={() => pick(day)}
											onkeydown={(e) => onDayKey(e, day)}
											onpointerenter={() => (hover = day)}>{Number(day.slice(8))}</button
										>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="foot">
				<button type="button" class="link-btn" onclick={() => close()}>{m.range_done()}</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.range {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-weight: 500;
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		width: 100%;
		min-height: var(--touch);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.trigger:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 0;
		border-color: var(--accent);
	}

	.trigger.invalid {
		border-color: var(--danger);
	}

	.trigger svg {
		flex-shrink: 0;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		color: var(--text-muted);
	}

	.placeholder {
		color: var(--text-muted);
	}

	/* phones: the calendar folds out below the field */
	.panel {
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	/* wider screens: a popover over the following fields */
	@media (min-width: 40rem) {
		.panel {
			position: absolute;
			top: 100%;
			left: 0;
			z-index: 20;
			width: 22rem;
			margin-top: var(--space-1);
			box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.18);
		}
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.month {
		font-weight: 600;
	}

	.nav {
		width: var(--touch);
		height: var(--touch);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: inherit;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
	}

	.nav:hover {
		background: var(--surface-2);
	}

	.step {
		margin: 0 0 var(--space-2);
		text-align: center;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	th {
		padding-bottom: var(--space-1);
		font-weight: 500;
	}

	td {
		padding: 1px 0;
	}

	.day {
		display: block;
		width: 100%;
		min-height: var(--touch);
		border: 0;
		border-radius: 0;
		background: none;
		color: inherit;
		font: inherit;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
	}

	.day:hover {
		background: var(--surface-2);
	}

	.day.today {
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.day.between {
		background: var(--accent-soft);
	}

	.day.start,
	.day.end {
		background: var(--accent);
		color: var(--accent-text);
	}

	.day.start {
		border-start-start-radius: var(--radius);
		border-end-start-radius: var(--radius);
	}

	.day.end {
		border-start-end-radius: var(--radius);
		border-end-end-radius: var(--radius);
	}

	.day:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
		position: relative;
	}

	.foot {
		display: flex;
		justify-content: flex-end;
	}
</style>
