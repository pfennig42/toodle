import type { ContactKind } from './contacts.js';

/**
 * Deep link for a contact option, or null if there is none (e.g. Signal usernames).
 * Values are normalized on input (see normalizeContact).
 */
export function contactHref(kind: ContactKind, value: string): string | null {
	switch (kind) {
		case 'phone':
			return `tel:${value}`;
		case 'whatsapp': {
			// wa.me needs the international number without + or leading zeros;
			// national numbers (0170…) are assumed to be German.
			const digits = value.replace(/^\+/, '').replace(/^00/, '').replace(/^0/, '49');
			return `https://wa.me/${digits}`;
		}
		case 'signal':
			return value.startsWith('+') || /^\d+$/.test(value)
				? `https://signal.me/#p/${value.startsWith('+') ? value : '+49' + value.replace(/^0/, '')}`
				: null;
		case 'telegram':
			return `https://t.me/${value.replace(/^@/, '')}`;
		case 'email':
			return `mailto:${value}`;
		case 'other':
			// a link (e.g. https://matrix.to/#/@anna:example.org) opens; anything else is shown as text
			return /^https:\/\/[^\s]+$/i.test(value) ? value : null;
	}
}
