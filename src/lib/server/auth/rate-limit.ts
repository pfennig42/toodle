/** Tiny in-memory sliding-window limiter – enough for a single-instance deployment. */
export function createRateLimiter(limit: number, windowMs: number) {
	const hits = new Map<string, number[]>();

	return {
		/** Returns true if the action is allowed (and records it). */
		take(key: string, now = Date.now()): boolean {
			const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
			if (recent.length >= limit) {
				hits.set(key, recent);
				return false;
			}
			recent.push(now);
			hits.set(key, recent);
			if (hits.size > 10_000) {
				for (const [k, ts] of hits) if (ts.every((t) => now - t >= windowMs)) hits.delete(k);
			}
			return true;
		}
	};
}
