CREATE TABLE IF NOT EXISTS `player_profiles` (
	`player_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`avatar` text DEFAULT '🎮' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_player_profiles_level` ON `player_profiles` (`level`,`total_points`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_player_profiles_points` ON `player_profiles` (`total_points`,`level`);
