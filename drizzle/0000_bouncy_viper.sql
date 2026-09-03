CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar` text DEFAULT '🎮' NOT NULL,
	`game_id` text NOT NULL,
	`score` integer NOT NULL,
	`won` integer DEFAULT false NOT NULL,
	`played_at` text NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`rules_version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scores_game_rules_score` ON `scores` (`game_id`,`rules_version`,`score`);--> statement-breakpoint
CREATE INDEX `idx_scores_player_game` ON `scores` (`player_id`,`game_id`);