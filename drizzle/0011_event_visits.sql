CREATE TABLE `event_visit` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`seen_at` integer NOT NULL,
	`dismissed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_visit_pk` ON `event_visit` (`user_id`,`event_id`);