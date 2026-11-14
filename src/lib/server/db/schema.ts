import { CONTACT_KINDS } from '../../contacts.js';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
	integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date());

export const user = sqliteTable(
	'user',
	{
		id: id(),
		email: text('email').notNull(),
		name: text('name'),
		passwordHash: text('password_hash'),
		locale: text('locale'),
		onboardedAt: integer('onboarded_at', { mode: 'timestamp' }),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('user_email_idx').on(t.email)]
);

/** Session id = SHA-256 of the cookie token, so a leaked DB does not leak sessions. */
export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
	},
	(t) => [index('session_user_idx').on(t.userId)]
);

/** Magic-link token; id = SHA-256 of the token sent by mail. */
export const loginToken = sqliteTable(
	'login_token',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull(),
		next: text('next'),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		usedAt: integer('used_at', { mode: 'timestamp' }),
		createdAt: createdAt()
	},
	(t) => [index('login_token_email_idx').on(t.email)]
);

export const contact = sqliteTable(
	'contact',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: CONTACT_KINDS }).notNull(),
		value: text('value').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('contact_user_idx').on(t.userId)]
);

/**
 * A place the user travels from/to regularly. `address` stays private,
 * `area` (town / district) is what other participants get to see.
 */
export const place = sqliteTable(
	'place',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		label: text('label').notNull(),
		address: text('address').notNull(),
		area: text('area').notNull(),
		lat: real('lat').notNull(),
		lon: real('lon').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('place_user_idx').on(t.userId)]
);

export type User = typeof user.$inferSelect;
export type Contact = typeof contact.$inferSelect;
export type Place = typeof place.$inferSelect;
