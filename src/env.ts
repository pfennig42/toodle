import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Path to the SQLite database file.',
		schema: (value) => value || './data/toodle.db'
	},
	SMTP_HOST: { description: 'SMTP server, e.g. smtp-relay.brevo.com.', schema: optional },
	SMTP_PORT: {
		description: 'SMTP port (587 = STARTTLS, 465 = TLS).',
		schema: (value) => Number(value || 587)
	},
	SMTP_USER: { description: 'SMTP login.', schema: optional },
	SMTP_PASS: { description: 'SMTP password / key.', schema: optional },
	GEOCODER_URL: {
		description: 'Photon-compatible geocoding API used for the address search.',
		schema: (value) => value || 'https://photon.komoot.io'
	},
	ORIGIN: {
		description: 'Public URL of the app, e.g. https://toodle.lu – used for links in mails.',
		schema: (value) => (value || 'http://localhost:5173').replace(/\/+$/, '')
	},
	NOTIFY_INTERVAL: {
		description: 'Seconds between runs of the notification job (0 = off).',
		schema: (value) => (value === undefined || value === '' ? 600 : Number(value))
	},
	MAIL_OUTBOX: {
		description: 'Testing only: append every mail as a JSON line to this file.',
		schema: optional
	},
	MAIL_FROM: {
		description: 'Sender address, e.g. "toodle <noreply@toodle.lu>".',
		schema: optional
	}
});
