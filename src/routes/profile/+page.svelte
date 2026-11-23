<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { contactName } from '#lib/labels.js';
	import { CONTACT_KINDS } from '#lib/contacts.js';
	import AddressSearch from '#lib/components/AddressSearch.svelte';
	import ContactEntry from '#lib/components/ContactEntry.svelte';
	import PushSettings from '#lib/components/PushSettings.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type PlaceDraft = {
		id?: string;
		label: string;
		value: { address: string; area: string; lat: number; lon: number } | null;
	};
	let editing = $state<PlaceDraft | null>(null);
	let contactValue = $state('');
	let contactKind = $state('phone');
	let contactLabel = $state('');
	let addingContact = $state(false);
	let contactInput: HTMLInputElement | undefined = $state();
	// No contact yet: the form is open right away. Otherwise behind "add another".
	const showContactForm = $derived(data.contacts.length === 0 || addingContact);

	function openContactForm() {
		// suggest a kind that isn't there yet
		// suggest a kind that isn't there yet ("other" can be there several times)
		contactKind =
			CONTACT_KINDS.find((k) => k !== 'other' && !data.contacts.some((c) => c.kind === k)) ??
			'other';
		addingContact = true;
		tick().then(() => contactInput?.focus());
	}
	// svelte-ignore state_referenced_locally
	let name = $state(data.profile.name);
	// svelte-ignore state_referenced_locally
	let prefs = $state({ ...data.prefs });

	const errorText = {
		name: m.error_name,
		contact: m.error_contact,
		place: m.error_place,
		password: m.error_password,
		confirm: m.error_confirm_email,
		limit: m.error_limit
	};
	const error = (section: string) =>
		form && 'error' in form && form.section === section
			? errorText[form.error as keyof typeof errorText]()
			: null;
	const saved = (section: string) => form && 'saved' in form && form.section === section;

	const keep = () => {
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
	};
</script>

<svelte:head><title>{m.profile_title()} · {m.app_name()}</title></svelte:head>

{#if data.back}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- checked same-site path -->
	<a class="back" href={data.back.href}>← {m.profile_back_to({ title: data.back.title })}</a>
{/if}
<h1>{m.profile_title()}</h1>

<!-- confirmation link requested from an event page without JavaScript -->
{#if form && form.section === 'verify'}
	{#if 'sent' in form}
		<p role="status">{m.event_verify_sent({ email: data.profile.email })}</p>
	{:else if 'error' in form}
		<p class="error" role="alert">
			{form.error === 'rate' ? m.event_verify_rate() : m.event_verify_error()}
		</p>
	{/if}
{/if}

<div class="stack-lg">
	<section class="card">
		<h2>{m.profile_name_title()}</h2>
		<form method="post" action="?/name" class="stack" use:enhance={keep}>
			<label class="field">
				<span>{m.field_name()}</span>
				<input name="name" required maxlength="80" autocomplete="name" bind:value={name} />
				<span class="muted small">{m.field_name_hint()}</span>
			</label>
			<p class="muted small">{m.field_email()}: {data.profile.email}</p>
			{#if error('name')}<p class="error">{error('name')}</p>{/if}
			<div class="actions">
				<button class="btn btn-primary">{m.save()}</button>
				{#if saved('name')}<span class="muted small" role="status">{m.saved()}</span>{/if}
			</div>
		</form>
		<details class="change-email" open={form?.section === 'email'}>
			<summary class="small">{m.profile_email_change()}</summary>
			<form method="post" action="?/changeEmail" class="stack" use:enhance={keep}>
				<label class="field">
					<span>{m.profile_email_new()}</span>
					<input
						name="email"
						type="email"
						required
						autocomplete="email"
						value={form?.section === 'email' && 'newEmail' in form ? form.newEmail : ''}
					/>
					<span class="muted small">{m.profile_email_change_hint()}</span>
				</label>
				{#if form?.section === 'email' && 'sentTo' in form}
					<p role="status">{m.profile_email_change_sent({ email: form.sentTo ?? '' })}</p>
				{:else if form?.section === 'email' && 'error' in form}
					<p class="error" role="alert">
						{form.error === 'rate'
							? m.event_verify_rate()
							: form.error === 'mail'
								? m.event_verify_error()
								: m.profile_email_change_invalid()}
					</p>
				{/if}
				<div class="actions">
					<button class="btn">{m.profile_email_change_submit()}</button>
				</div>
			</form>
		</details>
	</section>

	<section class="card">
		<h2>{m.profile_contacts_title()}</h2>
		<p class="muted small">{m.profile_contacts_hint()}</p>
		{#if data.contacts.length}
			<ul class="list">
				{#each data.contacts as c (c.id)}
					<li>
						<span><strong>{contactName(c)}</strong> {c.value}</span>
						<form method="post" action="?/deleteContact" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button class="btn small">{m.remove()}</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
		{#if showContactForm}
			<form
				method="post"
				action="?/addContact"
				class="row"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							contactValue = '';
							contactLabel = '';
							addingContact = false;
						}
					}}
			>
				<ContactEntry
					bind:kind={contactKind}
					bind:value={contactValue}
					bind:label={contactLabel}
					bind:input={contactInput}
					required
				/>
				<button class="btn">{m.add()}</button>
				{#if addingContact}
					<button type="button" class="btn" onclick={() => (addingContact = false)}
						>{m.cancel()}</button
					>
				{/if}
			</form>
		{:else if data.contacts.length < data.maxContacts}
			<button type="button" class="btn" onclick={openContactForm}
				>+ {m.profile_contacts_add()}</button
			>
		{/if}
		{#if error('contact')}<p class="error">{error('contact')}</p>{/if}
	</section>

	<section class="card">
		<h2>{m.profile_places_title()}</h2>
		<p class="muted small">{m.profile_places_hint()}</p>
		{#if data.places.length}
			<ul class="list">
				{#each data.places as p (p.id)}
					<li>
						<span>
							<strong>{p.label}</strong>
							<span class="muted small">{p.address}</span>
						</span>
						<span class="row">
							<button
								type="button"
								class="btn small"
								onclick={() =>
									(editing = {
										id: p.id,
										label: p.label,
										value: { address: p.address, area: p.area, lat: p.lat, lon: p.lon }
									})}>{m.edit()}</button
							>
							<form method="post" action="?/deletePlace" use:enhance>
								<input type="hidden" name="id" value={p.id} />
								<button class="btn small">{m.remove()}</button>
							</form>
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		{#if editing}
			<form
				method="post"
				action="?/savePlace"
				class="stack subcard"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') editing = null;
					}}
			>
				{#if editing.id}<input type="hidden" name="id" value={editing.id} />{/if}
				<label class="field">
					<span>{m.place_label()}</span>
					<input name="label" required maxlength="40" bind:value={editing.label} />
				</label>
				<div class="field">
					<label for="place-address">{m.place_address()}</label>
					<AddressSearch id="place-address" bind:value={editing.value} />
				</div>
				{#if error('place')}<p class="error">{error('place')}</p>{/if}
				<div class="actions">
					<button class="btn btn-primary" disabled={!editing.value}>{m.save()}</button>
					<button type="button" class="btn" onclick={() => (editing = null)}>{m.cancel()}</button>
				</div>
			</form>
		{:else}
			<button
				type="button"
				class="btn"
				onclick={() =>
					(editing = {
						label: data.places.length ? '' : m.place_default_home(),
						value: null
					})}>{m.place_add()}</button
			>
		{/if}
	</section>

	<section class="card">
		<h2>{m.profile_notify_title()}</h2>
		<form method="post" action="?/notifications" class="stack" use:enhance={keep}>
			<p class="muted small">{m.profile_notify_hint()}</p>
			<label class="check">
				<input type="checkbox" name="confirmation" bind:checked={prefs.confirmation} />
				<span>{m.profile_notify_confirmation()}</span>
			</label>
			<label class="check">
				<input type="checkbox" name="rides" bind:checked={prefs.rides} />
				<span
					>{m.profile_notify_rides()}<br /><span class="muted small"
						>{m.profile_notify_rides_hint()}</span
					></span
				>
			</label>
			<label class="check">
				<input type="checkbox" name="reminders" bind:checked={prefs.reminders} />
				<span
					>{m.profile_notify_reminders()}<br /><span class="muted small"
						>{m.profile_notify_reminders_hint()}</span
					></span
				>
			</label>
			{#if data.devices.length}
				<label class="check">
					<input type="checkbox" name="mailWithPush" bind:checked={prefs.mailWithPush} />
					<span
						>{m.profile_mail_with_push()}<br /><span class="muted small"
							>{m.profile_mail_with_push_hint()}</span
						></span
					>
				</label>
			{/if}
			<div class="actions">
				<button class="btn btn-primary">{m.save()}</button>
				{#if saved('notifications')}<span class="muted small" role="status">{m.saved()}</span>{/if}
			</div>
		</form>
	</section>

	<section class="card stack">
		<h2>{m.push_title()}</h2>
		<p class="muted small">{m.push_hint()}</p>
		<PushSettings />
		{#if data.devices.length}
			<div>
				<p class="small muted">{m.push_devices()}</p>
				<ul class="list">
					{#each data.devices as d (d.id)}
						<li>
							<span>{d.label || m.push_device_unknown()}</span>
							<form method="post" action="?/removeDevice" use:enhance>
								<input type="hidden" name="id" value={d.id} />
								<button class="btn small">{m.remove()}</button>
							</form>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>

	<section class="card">
		<h2>{m.profile_password_title()}</h2>
		<p class="muted small">
			{data.profile.hasPassword ? m.profile_password_set() : m.profile_password_none()}
		</p>
		<form method="post" action="?/setPassword" class="stack" use:enhance>
			<input type="hidden" name="username" autocomplete="username" value={data.profile.email} />
			<label class="field">
				<span>{m.field_new_password()}</span>
				<input
					type="password"
					name="password"
					autocomplete="new-password"
					minlength="10"
					required
				/>
			</label>
			{#if error('password')}<p class="error">{error('password')}</p>{/if}
			<div class="actions">
				<button class="btn btn-primary">{m.profile_password_save()}</button>
				{#if saved('password')}<span class="muted small" role="status">{m.saved()}</span>{/if}
			</div>
		</form>
		{#if data.profile.hasPassword}
			<form method="post" action="?/removePassword" use:enhance class="spaced">
				<button class="btn small">{m.profile_password_remove()}</button>
			</form>
		{/if}
	</section>

	<section class="card">
		<h2>{m.profile_session_title()}</h2>
		<form method="post" action="/logout">
			<button class="btn">{m.logout()}</button>
		</form>
	</section>

	<section class="card danger-zone">
		<h2>{m.profile_delete_title()}</h2>
		<p class="muted small">{m.profile_delete_hint()}</p>
		{#if data.soleEvents.length}
			<div class="small">
				<p class="error">{m.profile_delete_events()}</p>
				<ul>
					{#each data.soleEvents as e (e.id)}
						<li>
							<a href={resolve('/events/[id]', { id: e.id })}>{e.title}</a>{#if e.upcoming}
								<span class="muted"> · {m.profile_delete_event_notified()}</span>{/if}
						</li>
					{/each}
				</ul>
				<p class="muted">{m.profile_delete_events_hint()}</p>
			</div>
		{/if}
		<form method="post" action="?/deleteAccount" class="stack">
			<label class="field">
				<span>{m.profile_delete_confirm({ email: data.profile.email })}</span>
				<input name="confirm" type="email" autocomplete="off" required />
			</label>
			{#if error('delete')}<p class="error">{error('delete')}</p>{/if}
			<div class="actions">
				<button class="btn btn-danger">{m.profile_delete_submit()}</button>
			</div>
		</form>
	</section>
</div>

<style>
	.check {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		min-height: var(--touch);
		padding-block: var(--space-2);
		cursor: pointer;
	}

	.check input {
		width: 1.25rem;
		height: 1.25rem;
		margin-top: 0.1rem;
		flex-shrink: 0;
		accent-color: var(--accent);
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		font-weight: 600;
	}
</style>
