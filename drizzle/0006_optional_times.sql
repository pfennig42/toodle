ALTER TABLE `event` ADD `start_has_time` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `end_has_time` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `deadline_has_time` integer DEFAULT true NOT NULL;