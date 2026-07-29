CREATE TABLE `artist` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`fuzzle_id` text,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`email` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category_group_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_group_id`) REFERENCES `category_group`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `category_group` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `change_link` (
	`id` text PRIMARY KEY NOT NULL,
	`change_id` text NOT NULL,
	`role_assignment_id` text NOT NULL,
	FOREIGN KEY (`change_id`) REFERENCES `change`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_assignment_id`) REFERENCES `role_assignment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `change` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`anchor_after_scene_id` text,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `shoot_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`anchor_after_scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `role_assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`artist_id` text NOT NULL,
	`category_id` text,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `role_category_count` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`category_id` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_category_unique` ON `role_category_count` (`role_id`,`category_id`);--> statement-breakpoint
CREATE TABLE `role` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`name` text NOT NULL,
	`fuzzle_id` text,
	`description` text,
	`costume_makeup_note` text,
	`props_note` text,
	`note` text,
	`continuity_note` text,
	`gender_f` integer DEFAULT 0 NOT NULL,
	`gender_m` integer DEFAULT 0 NOT NULL,
	`gender_d` integer DEFAULT 0 NOT NULL,
	`age_note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scene` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`scene_number` text,
	`int_ext` text,
	`day_night` text,
	`script_time` text,
	`end_time` text,
	`location` text,
	`synopsis` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `shoot_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shoot_set_location` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`name` text,
	`address` text,
	FOREIGN KEY (`set_id`) REFERENCES `shoot_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shoot_set` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sd_number` text,
	`shoot_date` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `translation` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`locale` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translation_key_locale_unique` ON `translation` (`key`,`locale`);