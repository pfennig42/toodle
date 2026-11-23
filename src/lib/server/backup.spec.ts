import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { backupName } from './backup-rules';
import { backupDatabase } from './backup';

const dirs: string[] = [];
function tempDir() {
	const dir = mkdtempSync(join(tmpdir(), 'toodle-backup-'));
	dirs.push(dir);
	return dir;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function sourceDb() {
	const db = new Database(join(tempDir(), 'source.db'));
	db.pragma('journal_mode = WAL');
	db.exec('create table thing (name text)');
	db.prepare('insert into thing values (?)').run('Zelt');
	return db;
}

describe('backupDatabase', () => {
	it('writes a compressed, readable copy – and nothing new while nothing changed', async () => {
		const db = sourceDb();
		const dir = tempDir();
		const first = await backupDatabase(db, dir, new Date('2026-11-23T10:00:00Z'));
		expect(first.status).toBe('created');
		const files = readdirSync(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toMatch(/^toodle-20261123-100000Z-[0-9a-f]{12}\.db\.gz$/);

		// the copy is a working database
		const restored = join(tempDir(), 'restored.db');
		writeFileSync(restored, gunzipSync(readFileSync(join(dir, files[0]))));
		const copy = new Database(restored, { readonly: true });
		expect(copy.prepare('select name from thing').all()).toEqual([{ name: 'Zelt' }]);
		copy.close();

		const again = await backupDatabase(db, dir, new Date('2026-11-23T11:00:00Z'));
		expect(again.status).toBe('unchanged');
		expect(readdirSync(dir)).toHaveLength(1);

		db.prepare('insert into thing values (?)').run('Isomatte');
		const changed = await backupDatabase(db, dir, new Date('2026-11-23T12:00:00Z'));
		expect(changed.status).toBe('created');
		expect(readdirSync(dir)).toHaveLength(2);
		db.close();
	});

	it('thins out old backups and leaves no temporary files behind', async () => {
		const db = sourceDb();
		const dir = tempDir();
		const now = new Date('2026-11-23T10:00:00Z');
		const old = backupName(new Date('2026-01-01T00:00:00Z'), 'f'.repeat(64));
		const older = backupName(new Date('2025-12-01T00:00:00Z'), 'e'.repeat(64));
		writeFileSync(join(dir, old), 'x');
		writeFileSync(join(dir, older), 'x');
		writeFileSync(join(dir, 'README'), 'not a backup');

		const r = await backupDatabase(db, dir, now);
		expect(r.status === 'created' && r.deleted.sort()).toEqual([older, old].sort());
		const left = readdirSync(dir);
		expect(left).toHaveLength(2);
		expect(left).toContain('README');
		expect(left.some((f) => f.startsWith('.tmp-'))).toBe(false);
		db.close();
	});

	it('does nothing for a fresh, empty database', async () => {
		const db = new Database(':memory:');
		const dir = tempDir();
		expect(await backupDatabase(db, dir)).toEqual({ status: 'empty' });
		expect(readdirSync(dir)).toHaveLength(0);
	});
});
