CREATE TABLE `ride_link` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`direction` text NOT NULL,
	`driver_registration_id` text NOT NULL,
	`passenger_registration_id` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_registration_id`) REFERENCES `registration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`passenger_registration_id`) REFERENCES `registration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ride_link_passenger_idx` ON `ride_link` (`passenger_registration_id`,`direction`);--> statement-breakpoint
CREATE INDEX `ride_link_event_idx` ON `ride_link` (`event_id`,`direction`);