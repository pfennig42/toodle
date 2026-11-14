CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location_name` text DEFAULT '' NOT NULL,
	`location_address` text,
	`location_area` text,
	`lat` real,
	`lon` real,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`timezone` text DEFAULT 'Europe/Berlin' NOT NULL,
	`registration_deadline` integer,
	`registration_closed` integer DEFAULT false NOT NULL,
	`capacity` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_slug_idx` ON `event` (`slug`);--> statement-breakpoint
CREATE TABLE `event_organizer` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_organizer_pk` ON `event_organizer` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_organizer_user_idx` ON `event_organizer` (`user_id`);--> statement-breakpoint
CREATE TABLE `form_field` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`help` text DEFAULT '' NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `form_field_event_idx` ON `form_field` (`event_id`,`position`);--> statement-breakpoint
CREATE TABLE `organizer_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`created_by` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `organizer_invite_event_idx` ON `organizer_invite` (`event_id`);