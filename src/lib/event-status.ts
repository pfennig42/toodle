import { m } from './paraglide/messages.js';

export type RegistrationState = 'draft' | 'open' | 'closed' | 'deadline' | 'past' | 'archived';

export function stateLabel(state: RegistrationState): string {
	return {
		draft: m.state_draft,
		open: m.state_open,
		closed: m.state_closed,
		deadline: m.state_deadline,
		past: m.state_past,
		archived: m.state_archived
	}[state]();
}
