CREATE TABLE `hints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`node_id` text NOT NULL,
	`kind` text NOT NULL,
	`query` text NOT NULL,
	`explanation` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `games` ADD `difficulty` text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `gaps` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `mistakes` text DEFAULT '[]' NOT NULL;