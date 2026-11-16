import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { destroyOtherSessions, destroySession } from '#lib/server/auth/index.js';
import { hashPassword } from '#lib/server/auth/crypto.js';
import { isValidPassword, normalizeEmail } from '#lib/server/auth/validation.js';
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
import { PREF_KINDS, setPreference } from '#lib/server/notifications.js';
import { listDevices, removeSubscription } from '#lib/server/push.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
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
		prefs,
		devices: listDevices(me.id).map(({ id, label }) => ({ id, label })),
		profile: { name: me.name ?? '', email: me.email, hasPassword: me.hasPassword },
		contacts: listContacts(me.id).map(({ id, kind, value }) => ({ id, kind, value })),
		maxContacts: MAX_CONTACTS,
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

	deleteAccount: async ({ request, locals, cookies }) => {
		const confirm = normalizeEmail((await request.formData()).get('confirm'));
		if (confirm !== locals.user!.email) return fail(400, { section: 'delete', error: 'confirm' });
		destroySession(cookies);
		db.delete(user).where(eq(user.id, locals.user!.id)).run();
		redirect(303, '/?deleted=1');
	}
};
