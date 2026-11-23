/**
 * Backups of the SQLite database into BACKUP_DIR (off when unset) – from there, rsync or the
 * like takes them off the server.
 *
 * - SQLite's online backup: consistent while the app keeps running.
 * - Only when something changed: same content (hash) as the newest backup → nothing new.
 * - Checked (integrity_check) before it counts, gzip-compressed.
 * - Written under a temporary dot-name and renamed at the end: a sync never picks up a half file.
 * - Old ones are thinned out (backup-rules.ts).
 */
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import Database from 'better-sqlite3';
import { backupName, backupsToDelete, listBackups } from './backup-rules.js';

export type BackupResult =
	| { status: 'created'; name: string; deleted: string[] }
	| { status: 'unchanged'; deleted: string[] }
	| { status: 'empty' };

/** The database is passed in (no import of ./db): tests run this against a throwaway one. */
export async function backupDatabase(
	source: Database.Database,
	dir: string,
	now = new Date()
): Promise<BackupResult> {
	// a fresh installation has nothing worth keeping yet
	const tables = source.prepare("select count(*) as n from sqlite_master where type = 'table'");
	if ((tables.get() as { n: number }).n === 0) return { status: 'empty' };

	await mkdir(dir, { recursive: true });
	const tmp = join(dir, `.tmp-${randomBytes(6).toString('hex')}.db`);
	try {
		await source.backup(tmp);
		// a single self-contained file (the copy inherits WAL mode), then checked
		const check = new Database(tmp);
		check.pragma('journal_mode = DELETE');
		const integrity = check.pragma('integrity_check', { simple: true });
		check.close();
		if (integrity !== 'ok') throw new Error(`backup failed the integrity check: ${integrity}`);

		const hash = createHash('sha256')
			.update(await readFile(tmp))
			.digest('hex');
		const newest = listBackups(await readdir(dir))[0];
		let created: string | null = null;
		if (newest?.hash !== hash.slice(0, 12)) {
			const name = backupName(now, hash);
			const gz = `${tmp}.gz`;
			await pipeline(createReadStream(tmp), createGzip({ level: 9 }), createWriteStream(gz));
			await rename(gz, join(dir, name));
			created = name;
		}

		const deleted = backupsToDelete(await readdir(dir), now);
		for (const name of deleted) await rm(join(dir, name), { force: true });
		return created
			? { status: 'created', name: created, deleted }
			: { status: 'unchanged', deleted };
	} finally {
		for (const leftover of ['', '.gz', '-wal', '-shm', '-journal'])
			await rm(tmp + leftover, { force: true });
	}
}
