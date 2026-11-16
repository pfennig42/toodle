import { randomBytes } from 'node:crypto';
import { and, asc, eq, gt, lt, notInArray } from 'drizzle-orm';
import type { FieldDef } from '../forms.js';
import type { EventDetails } from './event-rules.js';
import { generateToken, hashToken } from './auth/crypto.js';
import { db } from './db/index.js';
import {
	event,
	eventOrganizer,
	formField,
	organizerInvite,
	user,
	type Event,
	type EventStatus
} from './db/schema.js';

export { parseEventDetails, publishBlockers, registrationState } from './event-rules.js';
export type { EventDetails, RegistrationState } from './event-rules.js';

const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o, 1/l/i
const INVITE_DAYS = 7;

export function generateSlug(length = 10): string {
	const bytes = randomBytes(length);
	return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join('');
}

/* --------------------------------------------------------------- lifecycle */

/** New events start with the travel field – it's what toodle is about. */
export function defaultFields(travelLabel: string): FieldDef[] {
	return [
		{
			type: 'travel',
			label: travelLabel,
			help: '',
			required: true,
			config: { directions: ['to', 'from'] }
		}
	];
}

export function createEvent(userId: string, details: EventDetails, fields: FieldDef[]): Event {
	return db.transaction(() => {
		const created = db
			.insert(event)
			.values({ ...details, slug: generateSlug(), createdBy: userId })
			.returning()
			.get();
		db.insert(eventOrganizer).values({ eventId: created.id, userId }).run();
		saveFields(created.id, fields);
		return created;
	});
}

export function updateEventDetails(eventId: string, details: EventDetails) {
	db.update(event)
		.set({ ...details, updatedAt: new Date() })
		.where(eq(event.id, eventId))
		.run();
}

export function setEventStatus(eventId: string, status: EventStatus) {
	db.update(event).set({ status, updatedAt: new Date() }).where(eq(event.id, eventId)).run();
}

export function setRegistrationClosed(eventId: string, closed: boolean) {
	db.update(event)
		.set({ registrationClosed: closed, updatedAt: new Date() })
		.where(eq(event.id, eventId))
		.run();
}

export function deleteEvent(eventId: string) {
	db.delete(event).where(eq(event.id, eventId)).run();
}

/** Copies details and form (not registrations, not the team) into a new draft. */
export function duplicateEvent(source: Event, userId: string, titleSuffix: string): Event {
	const fields = listFields(source.id).map(({ type, label, help, required, config }) => ({
		type,
		label,
		help,
		required,
		config
	}));
	return createEvent(
		userId,
		{
			title: `${source.title} ${titleSuffix}`.slice(0, 150),
			description: source.description,
			locationName: source.locationName,
			locationAddress: source.locationAddress,
			locationArea: source.locationArea,
			lat: source.lat,
			lon: source.lon,
			startsAt: source.startsAt,
			endsAt: source.endsAt,
			timezone: source.timezone,
			registrationDeadline: source.registrationDeadline,
			capacity: source.capacity,
			startHasTime: source.startHasTime,
			endHasTime: source.endHasTime,
			deadlineHasTime: source.deadlineHasTime
		},
		fields
	);
}

/* ------------------------------------------------------------------ access */

export function getEventForOrganizer(eventId: string, userId: string): Event | null {
	const row = db
		.select({ event })
		.from(event)
		.innerJoin(eventOrganizer, eq(eventOrganizer.eventId, event.id))
		.where(and(eq(event.id, eventId), eq(eventOrganizer.userId, userId)))
		.get();
	return row?.event ?? null;
}

export function getEventBySlug(slug: string): Event | null {
	return db.select().from(event).where(eq(event.slug, slug)).get() ?? null;
}

export function listEventsForOrganizer(userId: string): Event[] {
	return db
		.select({ event })
		.from(event)
		.innerJoin(eventOrganizer, eq(eventOrganizer.eventId, event.id))
		.where(eq(eventOrganizer.userId, userId))
		.orderBy(asc(event.startsAt))
		.all()
		.map((r) => r.event);
}

/* ------------------------------------------------------------------- form */

export function listFields(eventId: string) {
	return db
		.select()
		.from(formField)
		.where(eq(formField.eventId, eventId))
		.orderBy(asc(formField.position))
		.all();
}

/** Replaces the form: keeps ids of existing fields (answers stay attached), drops removed ones. */
export function saveFields(eventId: string, fields: FieldDef[]) {
	db.transaction(() => {
		const existing = new Set(listFields(eventId).map((f) => f.id));
		const keep = fields.map((f) => f.id).filter((id): id is string => !!id && existing.has(id));
		db.delete(formField)
			.where(
				keep.length
					? and(eq(formField.eventId, eventId), notInArray(formField.id, keep))
					: eq(formField.eventId, eventId)
			)
			.run();
		fields.forEach((f, position) => {
			const values = {
				position,
				type: f.type,
				label: f.label,
				help: f.help,
				required: f.required,
				config: f.config
			};
			if (f.id && existing.has(f.id)) {
				db.update(formField)
					.set(values)
					.where(and(eq(formField.id, f.id), eq(formField.eventId, eventId)))
					.run();
			} else {
				db.insert(formField)
					.values({ eventId, ...values })
					.run();
			}
		});
		db.update(event).set({ updatedAt: new Date() }).where(eq(event.id, eventId)).run();
	});
}

/* ------------------------------------------------------------------- team */

export function listOrganizers(eventId: string) {
	return db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(eventOrganizer)
		.innerJoin(user, eq(user.id, eventOrganizer.userId))
		.where(eq(eventOrganizer.eventId, eventId))
		.orderBy(asc(eventOrganizer.createdAt))
		.all();
}

/** Removes an organizer – but never the last one. */
export function removeOrganizer(eventId: string, userId: string): boolean {
	const team = listOrganizers(eventId);
	if (team.length <= 1 || !team.some((o) => o.id === userId)) return false;
	db.delete(eventOrganizer)
		.where(and(eq(eventOrganizer.eventId, eventId), eq(eventOrganizer.userId, userId)))
		.run();
	return true;
}

export function createOrganizerInvite(eventId: string, createdBy: string): string {
	const token = generateToken();
	db.delete(organizerInvite).where(lt(organizerInvite.expiresAt, new Date())).run();
	db.insert(organizerInvite)
		.values({
			id: hashToken(token),
			eventId,
			createdBy,
			expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000)
		})
		.run();
	return token;
}

export function findOrganizerInvite(token: string) {
	return (
		db
			.select({ invite: organizerInvite, event })
			.from(organizerInvite)
			.innerJoin(event, eq(event.id, organizerInvite.eventId))
			.where(
				and(eq(organizerInvite.id, hashToken(token)), gt(organizerInvite.expiresAt, new Date()))
			)
			.get() ?? null
	);
}

/** Joins the team via invite link (single use). Returns the event id or null. */
export function acceptOrganizerInvite(token: string, userId: string): string | null {
	return db.transaction(() => {
		const found = findOrganizerInvite(token);
		if (!found) return null;
		db.delete(organizerInvite).where(eq(organizerInvite.id, found.invite.id)).run();
		db.insert(eventOrganizer)
			.values({ eventId: found.event.id, userId })
			.onConflictDoNothing()
			.run();
		return found.event.id;
	});
}

export function pendingInviteCount(eventId: string): number {
	return db
		.select({ id: organizerInvite.id })
		.from(organizerInvite)
		.where(and(eq(organizerInvite.eventId, eventId), gt(organizerInvite.expiresAt, new Date())))
		.all().length;
}
