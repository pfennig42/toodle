import { CONTACT_KINDS } from '../../contacts.js';
import { FIELD_TYPES, TRAVEL_DIRECTIONS, type FieldConfig } from '../../forms.js';
import { CAR_STATUSES, TRAVEL_MODES, type AnswerValue } from '../../registration.js';
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

export const EVENT_STATUSES = ['draft', 'published', 'archived'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const event = sqliteTable(
	'event',
	{
		id: id(),
		/** Public, unguessable code used in /e/<slug> */
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		/** Name of the venue, e.g. "Jugendhof Waldheim" */
		locationName: text('location_name').notNull().default(''),
		locationAddress: text('location_address'),
		locationArea: text('location_area'),
		lat: real('lat'),
		lon: real('lon'),
		startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
		endsAt: integer('ends_at', { mode: 'timestamp' }).notNull(),
		timezone: text('timezone').notNull().default('Europe/Berlin'),
		registrationDeadline: integer('registration_deadline', { mode: 'timestamp' }),
		/** Manually closed by the organizers, independent of the deadline */
		registrationClosed: integer('registration_closed', { mode: 'boolean' })
			.notNull()
			.default(false),
		capacity: integer('capacity'),
		status: text('status', { enum: EVENT_STATUSES }).notNull().default('draft'),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [uniqueIndex('event_slug_idx').on(t.slug)]
);

export const eventOrganizer = sqliteTable(
	'event_organizer',
	{
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('event_organizer_pk').on(t.eventId, t.userId),
		index('event_organizer_user_idx').on(t.userId)
	]
);

/** Single-use link to join the organizer team; id = SHA-256 of the token. */
export const organizerInvite = sqliteTable(
	'organizer_invite',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		createdAt: createdAt()
	},
	(t) => [index('organizer_invite_event_idx').on(t.eventId)]
);

export const formField = sqliteTable(
	'form_field',
	{
		id: id(),
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		type: text('type', { enum: FIELD_TYPES }).notNull(),
		label: text('label').notNull(),
		help: text('help').notNull().default(''),
		required: integer('required', { mode: 'boolean' }).notNull().default(false),
		config: text('config', { mode: 'json' }).$type<FieldConfig>().notNull().default({})
	},
	(t) => [index('form_field_event_idx').on(t.eventId, t.position)]
);

export type Event = typeof event.$inferSelect;
export type FormField = typeof formField.$inferSelect;

export const REGISTRATION_STATUSES = ['active', 'withdrawn'] as const;

export const registration = sqliteTable(
	'registration',
	{
		id: id(),
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		status: text('status', { enum: REGISTRATION_STATUSES }).notNull().default('active'),
		comment: text('comment').notNull().default(''),
		createdAt: createdAt(),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [
		uniqueIndex('registration_event_user_idx').on(t.eventId, t.userId),
		index('registration_user_idx').on(t.userId)
	]
);

export const answer = sqliteTable(
	'answer',
	{
		registrationId: text('registration_id')
			.notNull()
			.references(() => registration.id, { onDelete: 'cascade' }),
		fieldId: text('field_id')
			.notNull()
			.references(() => formField.id, { onDelete: 'cascade' }),
		value: text('value', { mode: 'json' }).$type<AnswerValue>().notNull()
	},
	(t) => [uniqueIndex('answer_pk').on(t.registrationId, t.fieldId)]
);

/**
 * One direction of a participant's journey. Place data is a snapshot (copied from the
 * profile), so later profile changes don't alter past registrations.
 */
export const travelLeg = sqliteTable(
	'travel_leg',
	{
		id: id(),
		registrationId: text('registration_id')
			.notNull()
			.references(() => registration.id, { onDelete: 'cascade' }),
		direction: text('direction', { enum: TRAVEL_DIRECTIONS }).notNull(),
		time: integer('time', { mode: 'timestamp' }),
		mode: text('mode', { enum: TRAVEL_MODES }).notNull(),
		placeLabel: text('place_label'),
		placeAddress: text('place_address'),
		placeArea: text('place_area'),
		lat: real('lat'),
		lon: real('lon'),
		carStatus: text('car_status', { enum: CAR_STATUSES }),
		carNote: text('car_note').notNull().default('')
	},
	(t) => [uniqueIndex('travel_leg_direction_idx').on(t.registrationId, t.direction)]
);

/**
 * Alternative pick-up (arrival) or drop-off (departure) points for public transport users:
 * "I can be at station A at 16:40 or at station B at 17:10".
 */
export const pickupOption = sqliteTable(
	'pickup_option',
	{
		id: id(),
		legId: text('leg_id')
			.notNull()
			.references(() => travelLeg.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		label: text('label').notNull(),
		area: text('area').notNull(),
		lat: real('lat').notNull(),
		lon: real('lon').notNull(),
		time: integer('time', { mode: 'timestamp' })
	},
	(t) => [index('pickup_option_leg_idx').on(t.legId, t.position)]
);

export type Registration = typeof registration.$inferSelect;
export type TravelLeg = typeof travelLeg.$inferSelect;
export type PickupOption = typeof pickupOption.$inferSelect;

/**
 * Soft signal "passenger rides with driver" for one direction. Not a booking – it just
 * tells everyone (and the organizers) that this person is taken care of.
 */
export const rideLink = sqliteTable(
	'ride_link',
	{
		id: id(),
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		direction: text('direction', { enum: TRAVEL_DIRECTIONS }).notNull(),
		driverRegistrationId: text('driver_registration_id')
			.notNull()
			.references(() => registration.id, { onDelete: 'cascade' }),
		passengerRegistrationId: text('passenger_registration_id')
			.notNull()
			.references(() => registration.id, { onDelete: 'cascade' }),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(t) => [
		// one driver per passenger and direction
		uniqueIndex('ride_link_passenger_idx').on(t.passengerRegistrationId, t.direction),
		index('ride_link_event_idx').on(t.eventId, t.direction)
	]
);

export type RideLink = typeof rideLink.$inferSelect;
