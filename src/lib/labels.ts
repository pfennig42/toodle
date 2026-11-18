import { m } from './paraglide/messages.js';
import type { ContactKind, ContactOption } from './contacts.js';

export function contactKindLabel(kind: ContactKind | string): string {
	const labels: Record<ContactKind, () => string> = {
		phone: m.contact_phone,
		signal: m.contact_signal,
		whatsapp: m.contact_whatsapp,
		telegram: m.contact_telegram,
		email: m.contact_email,
		other: m.contact_other
	};
	return labels[kind as ContactKind]?.() ?? kind;
}

/** What to call a contact option: the service's own name for "other", else the kind. */
export function contactName(c: Pick<ContactOption, 'kind' | 'label'>): string {
	return c.kind === 'other' && c.label ? c.label : contactKindLabel(c.kind);
}
