export const CONTACT_KINDS = ['phone', 'signal', 'whatsapp', 'telegram', 'email', 'other'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** A contact option as shown to others. `label` names the service for kind "other" (e.g. Threema). */
export type ContactOption = { kind: ContactKind; value: string; label?: string | null };

export const CONTACT_LABEL_MAX = 30;

/** Name of the service for "other" (e.g. "Threema", "Matrix") – required there, null if invalid. */
export function normalizeContactLabel(raw: string): string | null {
	const label = raw.trim().replace(/\s+/g, ' ');
	return label && label.length <= CONTACT_LABEL_MAX ? label : null;
}

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
		case 'other':
			// any other messenger: an ID, a handle or a link – shown as given
			return value.replace(/\s+/g, ' ');
	}
}
