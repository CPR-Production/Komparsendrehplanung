CREATE TABLE `scene_color` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`state_key` text NOT NULL,
	`background_color` text NOT NULL,
	`text_color` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scene_color_project_state_unique` ON `scene_color` (`project_id`,`state_key`);