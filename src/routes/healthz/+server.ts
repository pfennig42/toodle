import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';

export const GET = () => {
	db.run(sql`select 1`);
	return new Response('ok', { headers: { 'cache-control': 'no-store' } });
};
