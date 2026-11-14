<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import AddressSearch from '#lib/components/AddressSearch.svelte';
	import ContactKindSelect from '#lib/components/ContactKindSelect.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let placeLabel = $state(m.place_default_home());
</script>

<svelte:head><title>{m.onboarding_title()} · {m.app_name()}</title></svelte:head>

<section class="card narrow">
	<h1>{m.onboarding_title()}</h1>
	<p class="muted">{m.onboarding_intro()}</p>

	<form method="post" class="stack">
		<input type="hidden" name="next" value={data.next ?? ''} />

		<fieldset>
			<legend>{m.onboarding_name_title()}</legend>
			<label class="field">
				<span>{m.field_name()}</span>
				<input
					name="name"
					required
					maxlength="80"
					autocomplete="name"
					value={form?.name ?? data.name}
				/>
				<span class="muted small">{m.field_name_hint()}</span>
			</label>
			{#if form?.errors?.name}<p class="error">{m.error_name()}</p>{/if}
		</fieldset>

		<fieldset>
			<legend>{m.onboarding_contact_title()} <span class="muted">({m.optional()})</span></legend>
			<p class="muted small">{m.onboarding_contact_hint()}</p>
			<div class="row">
				<ContactKindSelect />
				<input name="value" aria-label={m.contact_value()} value={form?.contactValue ?? ''} />
			</div>
			{#if form?.errors?.contact}<p class="error">{m.error_contact()}</p>{/if}
		</fieldset>

		<fieldset>
			<legend>{m.onboarding_place_title()} <span class="muted">({m.optional()})</span></legend>
			<p class="muted small">{m.onboarding_place_hint()}</p>
			<label class="field">
				<span>{m.place_label()}</span>
				<input name="label" maxlength="40" bind:value={placeLabel} />
			</label>
			<div class="field">
				<label for="onboarding-address">{m.place_address()}</label>
				<AddressSearch id="onboarding-address" />
			</div>
			{#if form?.errors?.place}<p class="error">{m.error_place()}</p>{/if}
		</fieldset>

		<fieldset>
			<legend>{m.onboarding_password_title()} <span class="muted">({m.optional()})</span></legend>
			<p class="muted small">{m.onboarding_password_hint()}</p>
			<input type="hidden" name="username" autocomplete="username" value={data.email} />
			<label class="field">
				<span>{m.field_new_password()}</span>
				<input type="password" name="password" autocomplete="new-password" minlength="10" />
			</label>
			{#if form?.errors?.password}<p class="error">{m.error_password()}</p>{/if}
		</fieldset>

		<div class="actions">
			<button class="btn btn-primary">{m.onboarding_submit()}</button>
		</div>
	</form>
</section>
