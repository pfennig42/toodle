import { CONTACT_KINDS } from '../../contacts.js';
import { FIELD_TYPES, TRAVEL_DIRECTIONS, type FieldConfig } from '../../forms.js';
import { CAR_STATUSES, TRAVEL_MODES, type AnswerValue } from '../../registration.js';
import { RIDE_VISIBILITIES } from '../../ride-visibility.js';
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
		/** Mail preferences (docs/konzept.md 4.7) – every kind can be switched off. */
		notifyConfirmation: integer('notify_confirmation', { mode: 'boolean' }).notNull().default(true),
		notifyRides: integer('notify_rides', { mode: 'boolean' }).notNull().default(true),
		notifyReminders: integer('notify_reminders', { mode: 'boolean' }).notNull().default(true),
		/** With push enabled on a device: still send hints and reminders by mail as well? */
		mailWithPush: integer('mail_with_push', { mode: 'boolean' }).notNull().default(false),
		/** Secret for unsubscribe links in mails (work without logging in). */
		unsubscribeToken: text('unsubscribe_token'),
		/**
		 * Set once the person has proven they own the address (magic link). Guests who register
		 * without logging in get a "silent" account without it (docs/konzept.md 5).
		 */
		emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('user_email_idx').on(t.email),
		uniqueIndex('user_unsubscribe_idx').on(t.unsubscribeToken)
	]
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
		/** Name of the service for kind "other" (e.g. Threema) */
		label: text('label'),
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
		/**
		 * Whether a time of day was given. Without one, start is the beginning of the day and
		 * end/deadline the end of the day – and only the date is shown.
		 */
		startHasTime: integer('start_has_time', { mode: 'boolean' }).notNull().default(true),
		endHasTime: integer('end_has_time', { mode: 'boolean' }).notNull().default(true),
		deadlineHasTime: integer('deadline_has_time', { mode: 'boolean' }).notNull().default(true),
		/** Manually closed by the organizers, independent of the deadline */
		registrationClosed: integer('registration_closed', { mode: 'boolean' })
			.notNull()
			.default(false),
		capacity: integer('capacity'),
		/**
		 * Where participants reach the organizers: shown on the event page and used as Reply-To
		 * of every event mail. Required for publishing (null only for legacy rows).
		 */
		contactEmail: text('contact_email'),
		rideVisibility: text('ride_visibility', { enum: RIDE_VISIBILITIES })
			.notNull()
			.default('public'),
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

/**
 * Events someone looked at while logged in – so the start page can offer to finish a
 * registration that was begun (e.g. after a detour to the profile). Hidden again on request.
 */
export const eventVisit = sqliteTable(
	'event_visit',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		seenAt: integer('seen_at', { mode: 'timestamp' }).notNull(),
		dismissedAt: integer('dismissed_at', { mode: 'timestamp' })
	},
	(t) => [uniqueIndex('event_visit_pk').on(t.userId, t.eventId)]
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
		/** false: only the day is known (stored as noon) – no time-of-day comparisons */
		hasClock: integer('has_clock', { mode: 'boolean' }).notNull().default(true),
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

export const NOTIFICATION_KINDS = [
	'confirmation',
	'ride_match',
	'ride_link',
	'travel_reminder'
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * What was already mailed – so nobody hears about the same thing twice. `ref` identifies the
 * subject, e.g. "to:<registration id>" for a ride match or the registration id for reminders.
 */
export const notification = sqliteTable(
	'notification',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		eventId: text('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: NOTIFICATION_KINDS }).notNull(),
		ref: text('ref').notNull(),
		/** null = only recorded (e.g. switched off), not mailed */
		sentAt: integer('sent_at', { mode: 'timestamp' }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('notification_unique_idx').on(t.userId, t.eventId, t.kind, t.ref),
		index('notification_user_event_idx').on(t.userId, t.eventId, t.kind)
	]
);

/** Web push subscriptions – one per device/browser (docs/konzept.md 4.7). */
export const pushSubscription = sqliteTable(
	'push_subscription',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		/** e.g. "Firefox · Android" – so people can tell their devices apart */
		label: text('label').notNull().default(''),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('push_endpoint_idx').on(t.endpoint), index('push_user_idx').on(t.userId)]
);

/** Small key/value store for instance settings generated at runtime (e.g. VAPID keys). */
export const appSetting = sqliteTable('app_setting', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
