import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { destroyOtherSessions, destroySession } from '#lib/server/auth/index.js';
import { hashPassword } from '#lib/server/auth/crypto.js';
import { sendLoginLink } from '#lib/server/auth/login-link.js';
import { requestEmailChange } from '#lib/server/auth/email-change.js';
import { createRateLimiter } from '#lib/server/auth/rate-limit.js';
import { isValidPassword, normalizeEmail, safeNext } from '#lib/server/auth/validation.js';
import { deleteEvent, getEventBySlug, soleOrganizedEvents } from '#lib/server/events.js';
import {
	addContact,
	addPlace,
	deleteContact,
	deletePlace,
	listContacts,
	listPlaces,
	MAX_CONTACTS,
	parseContact,
	parseName,
	parsePlace,
	updatePlace
} from '#lib/server/profile.js';
import { activeEventIds, promoteWaitlist } from '#lib/server/registrations.js';
import {
	cancellationMails,
	notifyPromoted,
	PREF_KINDS,
	sendAll,
	setPreference
} from '#lib/server/notifications.js';
import { listDevices, removeSubscription } from '#lib/server/push.js';
import type { Actions, PageServerLoad } from './$types';

const verifyPerUser = createRateLimiter(3, 15 * 60 * 1000);
const emailChangesPerUser = createRateLimiter(3, 60 * 60 * 1000);

/** Came here from an event's registration: offer the way back (the event isn't lost). */
function backTo(next: string | null) {
	const slug = next?.match(/^\/e\/([^/?#]+)/)?.[1];
	const e = slug ? getEventBySlug(slug) : null;
	return e && e.status !== 'draft' ? { title: e.title, href: next! } : null;
}

export const load: PageServerLoad = ({ locals, url }) => {
	const me = locals.user!;
	const prefs = db
		.select({
			confirmation: user.notifyConfirmation,
			rides: user.notifyRides,
			reminders: user.notifyReminders,
			mailWithPush: user.mailWithPush
		})
		.from(user)
		.where(eq(user.id, me.id))
		.get()!;
	return {
		back: backTo(safeNext(url.searchParams.get('next'))),
		prefs,
		devices: listDevices(me.id).map(({ id, label }) => ({ id, label })),
		profile: {
			name: me.name ?? '',
			email: me.email,
			hasPassword: me.hasPassword,
			emailVerified: me.emailVerified
		},
		contacts: listContacts(me.id).map(({ id, kind, value, label }) => ({ id, kind, value, label })),
		maxContacts: MAX_CONTACTS,
		/** deleting the account deletes these too (nobody else could manage them) */
		soleEvents: soleOrganizedEvents(me.id).map(({ id, title, status, endsAt }) => ({
			id,
			title,
			upcoming: status === 'published' && endsAt > new Date()
		})),
		places: listPlaces(me.id).map(({ id, label, address, area, lat, lon }) => ({
			id,
			label,
			address,
			area,
			lat,
			lon
		}))
	};
};

export const actions: Actions = {
	name: async ({ request, locals }) => {
		const name = parseName((await request.formData()).get('name'));
		if (!name) return fail(400, { section: 'name', error: 'name' });
		db.update(user).set({ name }).where(eq(user.id, locals.user!.id)).run();
		return { section: 'name', saved: true };
	},

	addContact: async ({ request, locals }) => {
		const input = parseContact(await request.formData());
		if (!input) return fail(400, { section: 'contact', error: 'contact' });
		if (!addContact(locals.user!.id, input))
			return fail(400, { section: 'contact', error: 'limit' });
		return { section: 'contact', saved: true };
	},

	deleteContact: async ({ request, locals }) => {
		deleteContact(locals.user!.id, String((await request.formData()).get('id')));
		return { section: 'contact', saved: true };
	},

	savePlace: async ({ request, locals }) => {
		const form = await request.formData();
		const input = parsePlace(form);
		const id = form.get('id');
		if (!input) return fail(400, { section: 'place', placeId: id, error: 'place' });
		if (id) updatePlace(locals.user!.id, String(id), input);
		else if (!addPlace(locals.user!.id, input))
			return fail(400, { section: 'place', error: 'limit' });
		return { section: 'place', saved: true };
	},

	deletePlace: async ({ request, locals }) => {
		deletePlace(locals.user!.id, String((await request.formData()).get('id')));
		return { section: 'place', saved: true };
	},

	setPassword: async ({ request, locals, cookies }) => {
		const password = (await request.formData()).get('password');
		if (!isValidPassword(password)) return fail(400, { section: 'password', error: 'password' });
		const passwordHash = await hashPassword(password);
		db.update(user).set({ passwordHash }).where(eq(user.id, locals.user!.id)).run();
		destroyOtherSessions(locals.user!.id, cookies);
		return { section: 'password', saved: true };
	},

	notifications: async ({ request, locals }) => {
		const form = await request.formData();
		for (const kind of PREF_KINDS) setPreference(locals.user!.id, kind, form.get(kind) === 'on');
		db.update(user)
			.set({ mailWithPush: form.get('mailWithPush') === 'on' })
			.where(eq(user.id, locals.user!.id))
			.run();
		return { section: 'notifications', saved: true };
	},

	removeDevice: async ({ request, locals }) => {
		removeSubscription(locals.user!.id, { id: String((await request.formData()).get('id')) });
		return { section: 'push', saved: true };
	},

	removePassword: ({ locals }) => {
		db.update(user).set({ passwordHash: null }).where(eq(user.id, locals.user!.id)).run();
		return { section: 'password', saved: true };
	},

	/**
	 * "Confirm your address": a magic link to the own address (e.g. before publishing an event).
	 * Used from other pages too – `next` leads back there.
	 */
	verifyEmail: async ({ request, locals, url }) => {
		const me = locals.user!;
		const next = safeNext((await request.formData()).get('next')) ?? '/profile';
		if (me.emailVerified) return { section: 'verify', verified: true };
		if (!verifyPerUser.take(me.id)) return fail(429, { section: 'verify', error: 'rate' });
		try {
			await sendLoginLink(me.email, next, url.origin);
		} catch (err) {
			console.error('[profile] could not send verification mail', err);
			return fail(500, { section: 'verify', error: 'mail' });
		}
		return { section: 'verify', sent: true };
	},

	/** A confirmation link to the new address – nothing changes until it's clicked. */
	changeEmail: async ({ request, locals }) => {
		const me = locals.user!;
		const raw = String((await request.formData()).get('email') ?? '');
		const email = normalizeEmail(raw);
		if (!email || email === me.email)
			return fail(400, { section: 'email', error: 'email', newEmail: raw.trim() });
		if (!emailChangesPerUser.take(me.id))
			return fail(429, { section: 'email', error: 'rate', newEmail: email });
		try {
			await requestEmailChange(me, email);
		} catch (err) {
			console.error('[profile] could not send e-mail change mail', err);
			return fail(500, { section: 'email', error: 'mail', newEmail: email });
		}
		return { section: 'email', sentTo: email };
	},

	deleteAccount: async ({ request, locals, cookies }) => {
		const confirm = normalizeEmail((await request.formData()).get('confirm'));
		if (confirm !== locals.user!.email) return fail(400, { section: 'delete', error: 'confirm' });
		// Events only this person organizes would be left behind without anybody to manage them:
		// they go too – and whoever registered for one hears that it's cancelled.
		const sole = soleOrganizedEvents(locals.user!.id);
		const mails = sole.flatMap((e) => cancellationMails(e.id));
		// places this person held elsewhere become free – the waiting lists move up
		const heldPlaces = activeEventIds(locals.user!.id);
		destroySession(cookies);
		db.transaction(() => {
			for (const e of sole) deleteEvent(e.id);
			db.delete(user).where(eq(user.id, locals.user!.id)).run();
		});
		void sendAll(mails);
		for (const eventId of heldPlaces) void notifyPromoted(eventId, promoteWaitlist(eventId));
		redirect(303, '/?deleted=1');
	}
};
