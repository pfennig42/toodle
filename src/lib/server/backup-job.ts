import { BACKUP_DIR } from '$app/env/private';
import { backupDatabase } from './backup.js';
import { sqlite } from './db/index.js';

const HOUR = 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

/** One backup now – logged, never throws (a failed backup must not stop the app). */
export async function backupNow(reason: string) {
	if (!BACKUP_DIR) return;
	try {
		const r = await backupDatabase(sqlite, BACKUP_DIR);
		if (r.status === 'created') console.info(`[backup] ${reason}: ${r.name}`);
		if (r.status !== 'empty' && r.deleted.length)
			console.info(`[backup] thinned out ${r.deleted.length} old backups`);
	} catch (err) {
		console.error(`[backup] ${reason} failed`, err);
	}
}

/** Hourly – an unchanged database doesn't produce a new file. */
export function startBackupJob() {
	if (timer || !BACKUP_DIR) return;
	timer = setInterval(() => void backupNow('hourly'), HOUR);
	timer.unref();
}
