<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { MODE_ICON, modeLabel } from '#lib/travel-summary.js';
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import RegistrationSummary from '#lib/components/RegistrationSummary.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Filter = 'active' | 'waitlisted' | 'withdrawn' | 'all';
	let query = $state('');
	let filter = $state<Filter>('active');
	let sort = $state<'name' | 'newest' | 'oldest'>('name');
	let confirming = $state<string | null>(null);

	const locale = getLocale();
	const active = $derived(data.participants.filter((p) => p.status === 'active'));
	const withdrawnCount = $derived(data.participants.filter((p) => p.status === 'withdrawn').length);
	const waitingCount = $derived(data.participants.filter((p) => p.status === 'waitlisted').length);

	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const list = data.participants.filter(
			(p) =>
				(filter === 'all' || p.status === filter) &&
				(!q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
		);
		return list.sort((a, b) =>
			sort === 'name'
				? a.name.localeCompare(b.name, locale)
				: sort === 'newest'
					? b.createdAt.getTime() - a.createdAt.getTime()
					: a.createdAt.getTime() - b.createdAt.getTime()
		);
	});

	const date = (d: Date) =>
		new Intl.DateTimeFormat(locale, {
			timeZone: data.timezone,
			day: 'numeric',
			month: 'short'
		}).format(d);

	const filters = $derived(
		[
			{ value: 'active', label: m.participants_filter_active, show: true },
			{ value: 'waitlisted', label: m.participants_filter_waitlisted, show: waitingCount > 0 },
			{ value: 'withdrawn', label: m.participants_filter_withdrawn, show: withdrawnCount > 0 },
			{ value: 'all', label: m.participants_filter_all, show: true }
		].filter((f) => f.show) as { value: Filter; label: () => string }[]
	);
</script>

<div class="stack-lg">
	<section class="stack">
		<details class="card add" open={!!form && 'addError' in form}>
			<summary>{m.participants_add()}</summary>
			<form
				method="post"
				action="?/add"
				class="stack"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: true })}
			>
				<p class="small muted">{m.participants_add_hint()}</p>
				<div class="row">
					<label class="field">
						<span>{m.field_name()}</span>
						<input
							name="name"
							required
							maxlength="80"
							autocomplete="off"
							value={form && 'addError' in form ? form.name : ''}
						/>
					</label>
					<label class="field">
						<span>{m.field_email()}</span>
						<input
							name="email"
							type="email"
							required
							autocomplete="off"
							value={form && 'addError' in form ? form.email : ''}
						/>
					</label>
				</div>
				{#if form?.addError}
					<p class="error small" role="alert">
						{{
							unpublished: m.participants_add_error_unpublished,
							unverified: m.participants_add_error_unverified,
							invalid: m.participants_add_error_invalid,
							rate: m.participants_add_error_rate,
							exists: m.participants_add_error_exists
						}[form.addError]()}
					</p>
				{/if}
				<div class="actions">
					<button class="btn btn-primary small">{m.participants_add_submit()}</button>
				</div>
			</form>
		</details>
		{#if active.length}
			<details class="card add" open={!!form?.messageError}>
				<summary>{m.participants_message()}</summary>
				<form
					method="post"
					action="?/message"
					class="stack"
					use:enhance={() =>
						async ({ update }) =>
							update({ reset: true })}
				>
					<p class="small muted">
						{m.participants_message_hint({ count: active.length })}
					</p>
					<label class="field">
						<span>{m.participants_message_subject()}</span>
						<input
							name="subject"
							required
							maxlength="120"
							value={form?.messageError ? form.subject : ''}
						/>
					</label>
					<label class="field">
						<span>{m.participants_message_text()}</span>
						<textarea name="text" rows="6" required maxlength="5000"
							>{form?.messageError ? form.text : ''}</textarea
						>
					</label>
					{#if waitingCount}
						<label class="check-row small">
							<input
								type="checkbox"
								name="waitlist"
								checked={!!form?.messageError && form.waitlist}
							/>
							{m.participants_message_waitlist({ count: waitingCount })}
						</label>
					{/if}
					{#if form?.messageError}
						<p class="error small" role="alert">
							{{
								unpublished: m.participants_add_error_unpublished,
								unverified: m.participants_add_error_unverified,
								invalid: m.participants_message_error_invalid,
								rate: m.participants_message_error_rate
							}[form.messageError]()}
						</p>
					{/if}
					<div class="actions">
						<button class="btn btn-primary small">{m.participants_message_send()}</button>
					</div>
				</form>
			</details>
		{/if}
		{#if form?.done === 'message'}
			<p class="small" role="status">
				{m.participants_message_sent({ count: form.messageCount ?? 0 })}
			</p>
		{/if}
		{#if form?.done === 'added'}
			<p class="small" role="status">{m.participants_done_added({ name: form.addedName })}</p>
		{/if}
		<p class="count">
			{m.participants_count({ count: active.length })}{data.capacity ? ` / ${data.capacity}` : ''}
			{#if waitingCount}<span class="small muted"
					>· {m.participants_waiting_count({ count: waitingCount })}</span
				>{/if}
			{#if withdrawnCount}<span class="small muted"
					>· {m.participants_withdrawn_count({ count: withdrawnCount })}</span
				>{/if}
		</p>
	</section>

	{#if data.participants.length}
		<section class="stack">
			<div class="toolbar">
				<input
					type="search"
					bind:value={query}
					placeholder={m.participants_search()}
					aria-label={m.participants_search()}
				/>
				<select bind:value={sort} aria-label={m.participants_sort()}>
					<option value="name">{m.participants_sort_name()}</option>
					<option value="newest">{m.participants_sort_newest()}</option>
					<option value="oldest">{m.participants_sort_oldest()}</option>
				</select>
			</div>
			{#if withdrawnCount || waitingCount}
				<div class="segmented" role="group" aria-label={m.participants_filter()}>
					{#each filters as f (f.value)}
						<button
							type="button"
							aria-pressed={filter === f.value}
							onclick={() => (filter = f.value)}>{f.label()}</button
						>
					{/each}
				</div>
			{/if}

			{#if form?.done && form.done !== 'added' && form.done !== 'message'}
				<p class="small" role="status">
					{form.done === 'withdrawn'
						? m.participants_done_withdrawn()
						: form.done === 'reactivated'
							? m.participants_done_reactivated()
							: m.participants_done_deleted()}
				</p>
			{/if}

			{#if shown.length}
				<ul class="plain people">
					{#each shown as p (p.registrationId)}
						<li class="card person" class:withdrawn={p.status === 'withdrawn'}>
							<details>
								<summary>
									<span class="who">
										<strong>{p.name}</strong>
										<span class="small muted email">{p.email}</span>
									</span>
									<span class="meta small">
										{#each p.legs as l (l.direction)}
											<span
												title={`${l.direction === 'to' ? m.travel_to() : m.travel_from()}: ${modeLabel(l.mode)}`}
												>{l.direction === 'to' ? '→' : '←'}{MODE_ICON[l.mode]}</span
											>
										{/each}
										{#if p.status === 'withdrawn'}
											<span class="badge">{m.participants_status_withdrawn()}</span>
										{:else if p.status === 'waitlisted'}
											<span class="badge"
												>{m.participants_status_waiting({
													position: p.waitlistPosition ?? 0
												})}</span
											>
										{:else}
											<span class="muted">{date(p.createdAt)}</span>
										{/if}
									</span>
								</summary>
								<div class="body stack">
									<RegistrationSummary
										fields={data.fields}
										answers={p.answers}
										legs={p.legs}
										comment={p.comment}
										timezone={data.timezone}
									/>
									{#each p.legs as l (l.direction)}
										{#if l.ridesWith}
											<p class="small">
												{l.direction === 'to' ? m.travel_to() : m.travel_from()}: {m.participants_rides_with(
													{ name: l.ridesWith }
												)}
											</p>
										{:else if l.passengers.length}
											<p class="small">
												{l.direction === 'to' ? m.travel_to() : m.travel_from()}: {m.participants_takes(
													{ names: l.passengers.join(', ') }
												)}
											</p>
										{/if}
									{/each}
									<ContactButtons contacts={[...p.contacts, { kind: 'email', value: p.email }]} />
									<p class="small muted">
										{m.participants_registered_at({
											date: date(p.createdAt)
										})}{p.updatedAt.getTime() - p.createdAt.getTime() > 60000
											? ` · ${m.participants_updated_at({ date: date(p.updatedAt) })}`
											: ''}
									</p>
									<div class="actions">
										{#if p.status === 'waitlisted'}
											<form method="post" action="?/reactivate" use:enhance>
												<input type="hidden" name="registration" value={p.registrationId} />
												<button class="btn btn-primary small">{m.participants_promote()}</button>
											</form>
										{/if}
										{#if p.status === 'active' || p.status === 'waitlisted'}
											{#if confirming === p.registrationId}
												<form
													method="post"
													action="?/withdraw"
													use:enhance={() =>
														async ({ update }) => {
															confirming = null;
															await update();
														}}
												>
													<input type="hidden" name="registration" value={p.registrationId} />
													<button class="btn btn-danger small"
														>{m.participants_withdraw_confirm({ name: p.name })}</button
													>
												</form>
												<button type="button" class="btn small" onclick={() => (confirming = null)}
													>{m.cancel()}</button
												>
											{:else}
												<button
													type="button"
													class="btn small"
													onclick={() => (confirming = p.registrationId)}
													>{m.participants_withdraw()}</button
												>
											{/if}
										{:else}
											<form method="post" action="?/reactivate" use:enhance>
												<input type="hidden" name="registration" value={p.registrationId} />
												<button class="btn small">{m.participants_reactivate()}</button>
											</form>
											{#if confirming === p.registrationId}
												<form
													method="post"
													action="?/delete"
													use:enhance={() =>
														async ({ update }) => {
															confirming = null;
															await update();
														}}
												>
													<input type="hidden" name="registration" value={p.registrationId} />
													<button class="btn btn-danger small"
														>{m.participants_delete_confirm()}</button
													>
												</form>
												<button type="button" class="btn small" onclick={() => (confirming = null)}
													>{m.cancel()}</button
												>
											{:else}
												<button
													type="button"
													class="btn small"
													onclick={() => (confirming = p.registrationId)}
													>{m.participants_delete()}</button
												>
											{/if}
										{/if}
									</div>
									{#if p.status === 'active' && confirming === p.registrationId}
										<p class="small muted">{m.participants_withdraw_hint()}</p>
									{/if}
								</div>
							</details>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted">{m.participants_none_found()}</p>
			{/if}
		</section>

		<!-- export: needed now and then, so quiet and at the end -->
		<section class="export stack-sm">
			<h2 class="small-title">{m.participants_export_title()}</h2>
			<div class="actions">
				<!-- eslint-disable svelte/no-navigation-without-resolve -- file download, not a page -->
				<a
					class="btn small"
					href={`${resolve('/events/[id]/participants.csv', { id: data.event.id })}`}
					download>{m.participants_export()}</a
				>
				{#if withdrawnCount}
					<a
						class="btn small"
						href={`${resolve('/events/[id]/participants.csv', { id: data.event.id })}?all=1`}
						download>{m.participants_export_all()}</a
					>
				{/if}
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
			<p class="small muted">{m.participants_export_hint()}</p>
		</section>
	{:else}
		<p class="empty muted">{m.participants_empty()}</p>
	{/if}
</div>

<style>
	.check-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.count {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
	}

	.export {
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.small-title {
		margin: 0;
		font-size: 1rem;
	}

	.empty {
		margin: 0;
	}

	.toolbar {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-2);
	}

	.toolbar input {
		min-width: 0;
	}

	.people {
		display: grid;
		gap: var(--space-2);
	}

	.person {
		padding: 0;
	}

	.person.withdrawn {
		opacity: 0.75;
	}

	summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		min-height: var(--touch);
		padding: var(--space-2) var(--space-3);
		cursor: pointer;
		list-style: none;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	.who {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.email {
		overflow-wrap: anywhere;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		white-space: nowrap;
	}

	.badge {
		padding: 0 var(--space-2);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text-muted);
	}

	.body {
		padding: 0 var(--space-3) var(--space-3);
		border-top: 1px solid var(--border);
		padding-top: var(--space-3);
	}

	.body p {
		margin: 0;
	}
</style>
