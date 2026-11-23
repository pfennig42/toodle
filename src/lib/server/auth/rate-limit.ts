/**
 * Tiny in-memory sliding-window limiter – enough for a single-instance deployment.
 * Keys (IP addresses, e-mail addresses) are forgotten soon after their window is over: expired
 * entries are swept on use and at least every 10 minutes – the privacy policy promises that IP
 * addresses are gone after at most 90 minutes (longest IP window: 1 hour).
 */
const SWEEP_MS = 10 * 60 * 1000;

export function createRateLimiter(limit: number, windowMs: number) {
	const hits = new Map<string, number[]>();
	let lastSweep = 0;

	function sweep(now: number) {
		for (const [k, ts] of hits) if (ts.every((t) => now - t >= windowMs)) hits.delete(k);
		lastSweep = now;
	}

	// also when nobody comes by – no IP address lingers in memory
	const timer = setInterval(() => sweep(Date.now()), Math.min(windowMs, SWEEP_MS));
	timer.unref?.();

	return {
		/** Returns true if the action is allowed (and records it). */
		take(key: string, now = Date.now()): boolean {
			if (now - lastSweep >= windowMs || hits.size > 10_000) sweep(now);
			const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
			if (recent.length >= limit) {
				hits.set(key, recent);
				return false;
			}
			recent.push(now);
			hits.set(key, recent);
			return true;
		},
		/** For tests: how many keys are remembered right now. */
		size: () => hits.size
	};
}
