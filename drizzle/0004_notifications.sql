CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`ref` text NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_unique_idx` ON `notification` (`user_id`,`event_id`,`kind`,`ref`);--> statement-breakpoint
CREATE INDEX `notification_user_event_idx` ON `notification` (`user_id`,`event_id`,`kind`);--> statement-breakpoint
ALTER TABLE `user` ADD `notify_confirmation` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `notify_rides` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `notify_reminders` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `unsubscribe_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_unsubscribe_idx` ON `user` (`unsubscribe_token`);