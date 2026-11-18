import { and, eq } from 'drizzle-orm';
import {
	CONTACT_KINDS,
	normalizeContact,
	normalizeContactLabel,
	type ContactKind,
	type ContactOption
} from '../contacts.js';
import { db } from './db/index.js';
import { contact, place } from './db/schema.js';

export const NAME_MAX = 80;
export const LABEL_MAX = 40;
export const MAX_CONTACTS = 6;
export const MAX_PLACES = 10;

export function parseName(value: FormDataEntryValue | null): string | null {
	const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
	return name && name.length <= NAME_MAX ? name : null;
}

export function parseContact(form: FormData): ContactOption | null {
	const kind = form.get('kind') as ContactKind;
	if (!CONTACT_KINDS.includes(kind)) return null;
	const value = normalizeContact(kind, String(form.get('value') ?? ''));
	if (!value) return null;
	if (kind !== 'other') return { kind, value, label: null };
	// another messenger: which one is needed, or nobody knows what the ID is for
	const label = normalizeContactLabel(String(form.get('contactLabel') ?? ''));
	return label ? { kind, value, label } : null;
}

export type PlaceInput = { label: string; address: string; area: string; lat: number; lon: number };

export function parsePlace(form: FormData): PlaceInput | null {
	const label = String(form.get('label') ?? '').trim();
	const address = String(form.get('address') ?? '').trim();
	const area = String(form.get('area') ?? '').trim();
	const lat = Number(form.get('lat'));
	const lon = Number(form.get('lon'));
	if (!label || label.length > LABEL_MAX || !address || address.length > 300) return null;
	if (!area || area.length > 120) return null;
	if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
		return null;
	return { label, address, area, lat, lon };
}

export function listContacts(userId: string) {
	return db
		.select()
		.from(contact)
		.where(eq(contact.userId, userId))
		.orderBy(contact.createdAt)
		.all();
}

export function listPlaces(userId: string) {
	return db.select().from(place).where(eq(place.userId, userId)).orderBy(place.createdAt).all();
}

export function addContact(userId: string, input: ContactOption) {
	if (listContacts(userId).length >= MAX_CONTACTS) return false;
	db.insert(contact)
		.values({ userId, ...input })
		.run();
	return true;
}

export function deleteContact(userId: string, id: string) {
	db.delete(contact)
		.where(and(eq(contact.id, id), eq(contact.userId, userId)))
		.run();
}

export function addPlace(userId: string, input: PlaceInput) {
	if (listPlaces(userId).length >= MAX_PLACES) return false;
	db.insert(place)
		.values({ userId, ...input })
		.run();
	return true;
}

export function updatePlace(userId: string, id: string, input: PlaceInput) {
	db.update(place)
		.set(input)
		.where(and(eq(place.id, id), eq(place.userId, userId)))
		.run();
}

export function deletePlace(userId: string, id: string) {
	db.delete(place)
		.where(and(eq(place.id, id), eq(place.userId, userId)))
		.run();
}
