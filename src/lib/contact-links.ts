import type { ContactKind } from './contacts.js';

/**
 * Deep link for a contact option, or null if there is none (e.g. Signal usernames).
 * Values are normalized on input (see normalizeContact).
 */
export function contactHref(kind: ContactKind, value: string): string | null {
	switch (kind) {
		case 'phone':
			return `tel:${value}`;
		case 'whatsapp':
			// wa.me needs the international number without "+" (numbers are stored as +…)
			return value.startsWith('+') ? `https://wa.me/${value.slice(1)}` : null;
		case 'signal':
			// numbers open a chat; usernames can't be linked
			return value.startsWith('+') ? `https://signal.me/#p/${value}` : null;
		case 'telegram':
			return `https://t.me/${value.replace(/^@/, '')}`;
		case 'email':
			return `mailto:${value}`;
		case 'other':
			// a link (e.g. https://matrix.to/#/@anna:example.org) opens; anything else is shown as text
			return /^https:\/\/[^\s]+$/i.test(value) ? value : null;
	}
}
