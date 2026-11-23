import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

// Unit tests never get the real database: `$app/env/private` is read once at start-up, so a
// test can't redirect it – it would silently work on the development data instead. Tests that
// need a database create their own (see retention.spec.ts).
if (process.env.VITEST) {
	throw new Error('db/index.ts must not be imported in unit tests – pass a test database in');
}

mkdirSync(dirname(resolve(DATABASE_URL)), { recursive: true });

const client = new Database(DATABASE_URL);
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');
client.pragma('busy_timeout = 5000');

export const db = drizzle(client, { schema });
/** The raw connection – for backups. */
export const sqlite = client;

/** Applies pending migrations from ./drizzle (generated via `npm run db:generate`). */
export function runMigrations() {
	const migrationsFolder = resolve('drizzle');
	if (!existsSync(resolve(migrationsFolder, 'meta/_journal.json'))) return;
	migrate(db, { migrationsFolder });
}
