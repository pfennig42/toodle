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
	TILE_URL: {
		description:
			'Map tiles ({z}/{x}/{y}), fetched through the app so visitors stay anonymous. Default: OpenStreetMap.',
		schema: (value) => value || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
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
	VAPID_PUBLIC_KEY: {
		description: 'Web push key pair (optional – generated and stored in the database otherwise).',
		schema: optional
	},
	VAPID_PRIVATE_KEY: {
		description: 'Web push private key (see VAPID_PUBLIC_KEY).',
		schema: optional
	},
	VAPID_SUBJECT: {
		description: 'Contact for push services, e.g. mailto:admin@toodle.lu (default: ORIGIN).',
		schema: optional
	},
	PUSH_OUTBOX: {
		description: 'Testing only: write push messages to this file instead of sending them.',
		schema: optional
	},
	ROUTING_URL: {
		description:
			'Optional OSRM server for real driving times, e.g. http://osrm:5000 (default: straight-line estimate).',
		schema: optional
	},
	MAIL_FROM: {
		description: 'Sender address, e.g. "toodle <noreply@toodle.lu>".',
		schema: optional
	}
});
