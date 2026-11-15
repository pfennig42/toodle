<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';

	type Status = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';
	let status = $state<Status>('loading');
	let busy = $state(false);
	let message = $state('');

	const supported = () =>
		'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

	onMount(async () => {
		if (!supported()) {
			const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
			status = ios ? 'ios-install' : 'unsupported';
			return;
		}
		if (Notification.permission === 'denied') {
			status = 'denied';
			return;
		}
		const reg = await navigator.serviceWorker.ready;
		status = (await reg.pushManager.getSubscription()) ? 'on' : 'off';
	});

	/** "Firefox · Android" – helps telling devices apart in the list. */
	function deviceLabel(): string {
		const ua = navigator.userAgent;
		const browser = /firefox|fxios/i.test(ua)
			? 'Firefox'
			: /edg\//i.test(ua)
				? 'Edge'
				: /chrome|crios/i.test(ua)
					? 'Chrome'
					: /safari/i.test(ua)
						? 'Safari'
						: 'Browser';
		const os = /android/i.test(ua)
			? 'Android'
			: /iphone|ipad|ipod/i.test(ua)
				? 'iOS'
				: /mac os/i.test(ua)
					? 'macOS'
					: /windows/i.test(ua)
						? 'Windows'
						: /linux/i.test(ua)
							? 'Linux'
							: '';
		return [browser, os].filter(Boolean).join(' · ');
	}

	function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
		const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
			.replace(/-/g, '+')
			.replace(/_/g, '/');
		const raw = atob(b64);
		const out = new Uint8Array(new ArrayBuffer(raw.length));
		for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
		return out;
	}

	async function enable() {
		busy = true;
		message = '';
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				status = permission === 'denied' ? 'denied' : 'off';
				return;
			}
			const { publicKey } = await (await fetch('/api/push')).json();
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: keyBytes(publicKey)
			});
			const res = await fetch('/api/push', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ subscription: sub.toJSON(), label: deviceLabel() })
			});
			if (!res.ok) {
				await sub.unsubscribe();
				const { error } = await res.json().catch(() => ({ error: '' }));
				message = error === 'limit' ? m.push_error_limit() : m.push_error();
				return;
			}
			status = 'on';
			await invalidateAll();
		} catch (err) {
			console.error(err);
			message = m.push_error();
		} finally {
			busy = false;
		}
	}

	async function disable() {
		busy = true;
		message = '';
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await fetch('/api/push', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint: sub.endpoint })
				});
				await sub.unsubscribe();
			}
			status = 'off';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function test() {
		busy = true;
		try {
			const res = await fetch('/api/push/test', { method: 'POST' });
			message = res.ok ? m.push_test_sent() : m.push_error();
		} finally {
			busy = false;
		}
	}
</script>

<div class="stack">
	{#if status === 'unsupported'}
		<p class="muted small">{m.push_unsupported()}</p>
	{:else if status === 'ios-install'}
		<p class="muted small">{m.push_ios()}</p>
	{:else if status === 'denied'}
		<p class="muted small">{m.push_denied()}</p>
	{:else if status === 'on'}
		<p class="small" role="status">✓ {m.push_on()}</p>
		<div class="actions">
			<button type="button" class="btn small" disabled={busy} onclick={test}>{m.push_test()}</button
			>
			<button type="button" class="btn small" disabled={busy} onclick={disable}
				>{m.push_disable()}</button
			>
		</div>
	{:else if status === 'off'}
		<p class="muted small">{m.push_off_hint()}</p>
		<div class="actions">
			<button type="button" class="btn" disabled={busy} onclick={enable}>{m.push_enable()}</button>
		</div>
	{/if}
	{#if message}<p class="small" role="status">{message}</p>{/if}
</div>
