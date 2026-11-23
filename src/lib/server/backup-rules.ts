/**
 * Which backups to keep (grandfather–father–son): the closer to now, the denser.
 *
 * - everything from the last 24 hours (e.g. the one taken right before an update)
 * - the newest of each day for 14 days
 * - the newest of each week for 8 weeks
 * - the newest of each month for 6 months
 *
 * Nothing older: backups contain personal data, and what the retention rules delete
 * (retention.ts) must not live on in old backups for long. The very newest backup always stays –
 * if nothing changed for months, it is still the current state.
 */

export type Backup = { name: string; at: Date; hash: string };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const KEEP_ALL_MS = DAY;
/** The longest one (6 months) is named in the privacy policy. */
export const TIERS: { maxAge: number; period: (d: Date) => string }[] = [
	{ maxAge: 14 * DAY, period: (d) => d.toISOString().slice(0, 10) },
	{ maxAge: 8 * 7 * DAY, period: (d) => mondayOf(d) },
	{ maxAge: 183 * DAY, period: (d) => d.toISOString().slice(0, 7) }
];
function mondayOf(d: Date): string {
	const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
	day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
	return day.toISOString().slice(0, 10);
}

const PREFIX = 'toodle-';
const SUFFIX = '.db.gz';
const NAME = /^toodle-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})Z-([0-9a-f]{12})\.db\.gz$/;

/** toodle-20261123-100000Z-0123456789ab.db.gz – sorts by time, says which content. */
export function backupName(at: Date, hash: string): string {
	const stamp = at.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
	return `${PREFIX}${stamp}Z-${hash.slice(0, 12)}${SUFFIX}`;
}

export function parseBackupName(name: string): Backup | null {
	const m = NAME.exec(name);
	if (!m) return null;
	const [, y, mo, d, h, mi, s, hash] = m;
	return { name, at: new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`), hash };
}

/** Newest first. Ignores anything that isn't a backup (and half-written temporary files). */
export function listBackups(names: string[]): Backup[] {
	return names
		.map(parseBackupName)
		.filter((b): b is Backup => !!b)
		.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** The backups that can go, by name. */
export function backupsToDelete(names: string[], now = new Date()): string[] {
	const backups = listBackups(names);
	const keep = new Set<string>(backups.slice(0, 1).map((b) => b.name));
	for (const b of backups) if (now.getTime() - b.at.getTime() < KEEP_ALL_MS) keep.add(b.name);
	for (const tier of TIERS) {
		const seen = new Set<string>();
		for (const b of backups) {
			if (now.getTime() - b.at.getTime() >= tier.maxAge) continue;
			const key = tier.period(b.at);
			if (seen.has(key)) continue;
			seen.add(key);
			keep.add(b.name);
		}
	}
	return backups.filter((b) => !keep.has(b.name)).map((b) => b.name);
}
