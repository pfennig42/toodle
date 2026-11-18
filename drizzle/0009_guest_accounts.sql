ALTER TABLE `user` ADD `email_verified_at` integer;--> statement-breakpoint
-- every account so far came in through a magic link or a password: verified
UPDATE `user` SET `email_verified_at` = `created_at`;
