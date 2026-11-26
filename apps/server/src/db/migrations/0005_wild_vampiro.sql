CREATE TABLE `schedule` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`script_revision` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `shoot_set` ADD `schedule_id` text REFERENCES schedule(id);
--> statement-breakpoint
/* Jedes Bestandsprojekt bekommt einen Drehplan — auch eines ohne Sets, damit
   keines ohne Plan dasteht. Der Name ist ein Anfang, kein Befund; umbenennen
   geht in der Übersicht. Die UUID entsteht je Zeile, weil randomblob() pro
   Zeile ausgewertet wird. */
INSERT INTO `schedule` (`id`, `project_id`, `name`, `script_revision`, `sort_order`)
SELECT
	lower(
		hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
		substr(hex(randomblob(2)), 2) || '-' ||
		substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
		hex(randomblob(6))
	),
	`id`,
	'Drehplan 1',
	NULL,
	0
FROM `project`;
--> statement-breakpoint
/* Die bestehenden Sets ziehen in den Plan ihres Projekts. Je Projekt gibt es
   nach dem INSERT oben genau einen, die Unterabfrage ist also eindeutig. */
UPDATE `shoot_set`
SET `schedule_id` = (
	SELECT `id` FROM `schedule` WHERE `schedule`.`project_id` = `shoot_set`.`project_id`
)
WHERE `schedule_id` IS NULL;
