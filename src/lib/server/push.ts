/**
 * Web push (docs/konzept.md 4.7). VAPID keys are generated on first use and stored in the
 * database, so self-hosters don't have to configure anything (env vars override them).
 */
import { appendFileSync } from 'node:fs';
import { and, count, eq } from 'drizzle-orm';
import webpush from 'web-push';
import {
	ORIGIN,
	PUSH_OUTBOX,
	VAPID_PRIVATE_KEY,
	VAPID_PUBLIC_KEY,
	VAPID_SUBJECT
} from '$app/env/private';
import { db } from './db/index.js';
import { appSetting, pushSubscription } from './db/schema.js';

export const MAX_DEVICES = 10;

export { isAllowedEndpoint } from './push-endpoint.js';
import { isAllowedEndpoint } from './push-endpoint.js';

let keys: { publicKey: string; privateKey: string } | null = null;

export function vapidKeys() {
	if (keys) return keys;
	if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
		keys = { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
		return keys;
	}
	const stored = db.select().from(appSetting).where(eq(appSetting.key, 'vapid')).get();
	if (stored) {
		keys = JSON.parse(stored.value);
		return keys!;
	}
	const generated = webpush.generateVAPIDKeys();
	db.insert(appSetting)
		.values({ key: 'vapid', value: JSON.stringify(generated) })
		.onConflictDoNothing()
		.run();
	// another process may have won the race – always use what is stored
	keys = JSON.parse(db.select().from(appSetting).where(eq(appSetting.key, 'vapid')).get()!.value);
	return keys!;
}

function subject(): string {
	if (VAPID_SUBJECT) return VAPID_SUBJECT;
	return ORIGIN.startsWith('https://') ? ORIGIN : 'mailto:noreply@toodle.lu';
}

export type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

export function parseSubscription(input: unknown): SubscriptionInput | null {
	if (typeof input !== 'object' || !input) return null;
	const s = input as Record<string, unknown>;
	const k = (s.keys ?? {}) as Record<string, unknown>;
	if (typeof s.endpoint !== 'string' || s.endpoint.length > 1000) return null;
	if (typeof k.p256dh !== 'string' || typeof k.auth !== 'string') return null;
	if (k.p256dh.length > 200 || k.auth.length > 100) return null;
	if (!isAllowedEndpoint(s.endpoint)) return null;
	return { endpoint: s.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } };
}

/** Stores (or moves to this user) a device subscription. False when the device limit is hit. */
export function saveSubscription(userId: string, sub: SubscriptionInput, label: string): boolean {
	const existing = db
		.select()
		.from(pushSubscription)
		.where(eq(pushSubscription.endpoint, sub.endpoint))
		.get();
	if (existing) {
		db.update(pushSubscription)
			.set({ userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, label })
			.where(eq(pushSubscription.id, existing.id))
			.run();
		return true;
	}
	const n =
		db
			.select({ n: count() })
			.from(pushSubscription)
			.where(eq(pushSubscription.userId, userId))
			.get()?.n ?? 0;
	if (n >= MAX_DEVICES) return false;
	db.insert(pushSubscription)
		.values({
			userId,
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth,
			label: label.slice(0, 80)
		})
		.run();
	return true;
}

export function removeSubscription(userId: string, by: { endpoint?: string; id?: string }) {
	db.delete(pushSubscription)
		.where(
			and(
				eq(pushSubscription.userId, userId),
				by.id ? eq(pushSubscription.id, by.id) : eq(pushSubscription.endpoint, by.endpoint ?? '')
			)
		)
		.run();
}

export function listDevices(userId: string) {
	return db
		.select({
			id: pushSubscription.id,
			label: pushSubscription.label,
			createdAt: pushSubscription.createdAt
		})
		.from(pushSubscription)
		.where(eq(pushSubscription.userId, userId))
		.all();
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Sends to all devices of a user. Returns how many devices accepted the message. */
export async function sendPush(userId: string, msg: PushMessage): Promise<number> {
	const subs = db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId)).all();
	if (!subs.length) return 0;
	const payload = JSON.stringify(msg);

	if (PUSH_OUTBOX) {
		appendFileSync(PUSH_OUTBOX, JSON.stringify({ userId, ...msg }) + '\n');
		return subs.length;
	}

	const { publicKey, privateKey } = vapidKeys();
	let delivered = 0;
	for (const s of subs) {
		try {
			await webpush.sendNotification(
				{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
				payload,
				{
					vapidDetails: { subject: subject(), publicKey, privateKey },
					TTL: 24 * 60 * 60,
					urgency: 'normal',
					timeout: 10_000
				}
			);
			delivered++;
		} catch (err) {
			const status = (err as { statusCode?: number }).statusCode;
			// gone or invalid: the browser dropped the subscription
			if (status === 404 || status === 410) {
				db.delete(pushSubscription).where(eq(pushSubscription.id, s.id)).run();
			} else {
				console.error('[push] sending failed', status ?? err);
			}
		}
	}
	return delivered;
}
