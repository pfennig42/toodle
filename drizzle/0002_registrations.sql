CREATE TABLE `answer` (
	`registration_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `form_field`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_pk` ON `answer` (`registration_id`,`field_id`);--> statement-breakpoint
CREATE TABLE `pickup_option` (
	`id` text PRIMARY KEY NOT NULL,
	`leg_id` text NOT NULL,
	`position` integer NOT NULL,
	`label` text NOT NULL,
	`area` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`time` integer,
	FOREIGN KEY (`leg_id`) REFERENCES `travel_leg`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pickup_option_leg_idx` ON `pickup_option` (`leg_id`,`position`);--> statement-breakpoint
CREATE TABLE `registration` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_event_user_idx` ON `registration` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `registration_user_idx` ON `registration` (`user_id`);--> statement-breakpoint
CREATE TABLE `travel_leg` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`direction` text NOT NULL,
	`time` integer,
	`mode` text NOT NULL,
	`place_label` text,
	`place_address` text,
	`place_area` text,
	`lat` real,
	`lon` real,
	`car_status` text,
	`car_note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `travel_leg_direction_idx` ON `travel_leg` (`registration_id`,`direction`);