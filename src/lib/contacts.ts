export const CONTACT_KINDS = ['phone', 'signal', 'whatsapp', 'telegram', 'email'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** Normalizes and validates a contact value; returns null if invalid. Shared by client & server. */
export function normalizeContact(kind: ContactKind, raw: string): string | null {
	const value = raw.trim();
	if (!value || value.length > 100) return null;
	switch (kind) {
		case 'phone':
		case 'whatsapp':
		case 'signal': {
			const phone = value.replace(/[\s\-/().]/g, '');
			if (kind === 'signal' && !phone.startsWith('+') && /^[a-z0-9_.]{3,}$/i.test(value))
				return value; // Signal username
			return /^\+?[0-9]{6,15}$/.test(phone) ? phone : null;
		}
		case 'telegram': {
			const handle = value.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
			return /^[a-z0-9_]{5,32}$/i.test(handle) ? `@${handle}` : null;
		}
		case 'email':
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
	}
}
