ALTER TABLE `event` ADD `contact_email` text;
--> statement-breakpoint
-- Existing events: the address of whoever created them (or the first remaining organizer).
UPDATE `event` SET `contact_email` = coalesce(
	(SELECT `email` FROM `user` WHERE `user`.`id` = `event`.`created_by`),
	(SELECT `u`.`email` FROM `event_organizer` `o` JOIN `user` `u` ON `u`.`id` = `o`.`user_id`
	 WHERE `o`.`event_id` = `event`.`id` ORDER BY `o`.`created_at` LIMIT 1)
);
