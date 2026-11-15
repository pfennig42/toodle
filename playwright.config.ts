import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;
export const E2E_DB = 'e2e/.tmp/test.db';
export const E2E_OUTBOX = 'e2e/.tmp/outbox.jsonl';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		locale: 'de-DE',
		timezoneId: 'Europe/Berlin',
		trace: 'retain-on-failure'
	},
	projects: [
		{
			name: 'mobile',
			use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } }
		},
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }
	],
	webServer: {
		// Fresh database on every run; mails go to the console (no SMTP_HOST).
		command: `npm run build && rm -rf e2e/.tmp && mkdir -p e2e/.tmp && node build`,
		url: `http://localhost:${PORT}/healthz`,
		reuseExistingServer: false,
		timeout: 180_000,
		env: {
			PORT: String(PORT),
			ORIGIN: `http://localhost:${PORT}`,
			DATABASE_URL: E2E_DB,
			SMTP_HOST: '',
			// Mails are appended here so tests can read them; the notification job runs every second.
			MAIL_OUTBOX: E2E_OUTBOX,
			NOTIFY_INTERVAL: '1'
		}
	}
});
