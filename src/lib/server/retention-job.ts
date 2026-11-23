import { db } from './db/index.js';
import { purgeOldData } from './retention.js';

const DAY = 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

/** Once at start-up, then daily. */
export function startRetentionJob() {
	if (timer) return;
	const run = () => {
		try {
			const r = purgeOldData(db);
			if (r.registrations || r.guests)
				console.info(
					`[retention] deleted ${r.registrations} registrations of ${r.events} past events, ${r.guests} unused guest accounts`
				);
		} catch (err) {
			console.error('[retention] failed', err);
		}
	};
	run();
	timer = setInterval(run, DAY);
	timer.unref();
}
