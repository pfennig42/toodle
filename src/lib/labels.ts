import { m } from './paraglide/messages.js';
import type { ContactKind } from './contacts.js';

export function contactKindLabel(kind: ContactKind | string): string {
	const labels: Record<ContactKind, () => string> = {
		phone: m.contact_phone,
		signal: m.contact_signal,
		whatsapp: m.contact_whatsapp,
		telegram: m.contact_telegram,
		email: m.contact_email
	};
	return labels[kind as ContactKind]?.() ?? kind;
}
