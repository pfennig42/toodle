import { describe, expect, it } from 'vitest';
import { backupName, backupsToDelete, listBackups, parseBackupName } from './backup-rules';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-23T10:30:00Z');
const hash = '0123456789abcdef';
const ago = (ms: number) => backupName(new Date(now.getTime() - ms), hash);

describe('backup names', () => {
	it('round-trips time and content hash', () => {
		const name = backupName(new Date('2026-11-23T09:05:07.123Z'), hash);
		expect(name).toBe('toodle-20261123-090507Z-0123456789ab.db.gz');
		expect(parseBackupName(name)).toEqual({
			name,
			at: new Date('2026-11-23T09:05:07Z'),
			hash: '0123456789ab'
		});
	});

	it('ignores other files, newest first', () => {
		const a = ago(HOUR);
		const b = ago(2 * HOUR);
		expect(listBackups([b, '.tmp-abc.db.gz', 'notes.txt', a]).map((x) => x.name)).toEqual([a, b]);
	});
});

describe('backupsToDelete', () => {
	it('thins out: all of today, then daily, weekly, monthly – nothing beyond six months', () => {
		// one backup every hour for a whole year
		const all = Array.from({ length: 365 * 24 }, (_, i) => ago(i * HOUR));
		const gone = new Set(backupsToDelete(all, now));
		const kept = all.filter((n) => !gone.has(n)).map((n) => parseBackupName(n)!.at);

		const age = (d: Date) => (now.getTime() - d.getTime()) / HOUR / 24;
		expect(kept.filter((d) => age(d) < 1)).toHaveLength(24);
		// one per day for two weeks (plus today's), weekly and monthly ones further back
		expect(kept.filter((d) => age(d) >= 1 && age(d) < 14).length).toBeGreaterThanOrEqual(13);
		// (one more: the newest of last month may fall into this range)
		expect(kept.filter((d) => age(d) >= 14 && age(d) < 56).length).toBeLessThanOrEqual(8);
		expect(kept.filter((d) => age(d) >= 56).length).toBeLessThanOrEqual(6);
		expect(Math.max(...kept.map(age))).toBeLessThan(183);
		expect(kept.length).toBeLessThan(60);
	});

	it('keeps the result stable – running it again deletes nothing more', () => {
		const all = Array.from({ length: 200 * 24 }, (_, i) => ago(i * HOUR));
		const gone = new Set(backupsToDelete(all, now));
		const kept = all.filter((n) => !gone.has(n));
		expect(backupsToDelete(kept, now)).toEqual([]);
	});

	it('never deletes the newest backup, however old', () => {
		const old = ago(400 * 24 * HOUR);
		const older = ago(500 * 24 * HOUR);
		expect(backupsToDelete([old, older], now)).toEqual([older]);
	});
});
