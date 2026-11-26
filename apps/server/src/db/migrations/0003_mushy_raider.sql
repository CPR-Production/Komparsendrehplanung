ALTER TABLE `shoot_set_location` ADD `kind` text DEFAULT 'motif' NOT NULL;
--> statement-breakpoint
/* Jede bisherige Zeile war ein Paar aus Motiv (`name`) und Location
   (`address`). Die Adresse wird eine Zeile für sich, damit drei Motive sich
   eine Location teilen können. `kind = 'motif'` filtert die eben erzeugten
   Zeilen wieder heraus — sonst läse das SELECT, was dasselbe INSERT schreibt. */
INSERT INTO `shoot_set_location` (`id`, `set_id`, `sort_order`, `kind`, `name`, `address`)
SELECT
	lower(
		hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
		substr(hex(randomblob(2)), 2) || '-' ||
		substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
		hex(randomblob(6))
	),
	`set_id`,
	`sort_order`,
	'location',
	`address`,
	NULL
FROM `shoot_set_location`
WHERE `kind` = 'motif' AND `address` IS NOT NULL AND trim(`address`) <> '';
--> statement-breakpoint
/* Zeilen, die nur je eine Adresse trugen, bleiben sonst als leeres Motiv
   zurück — sichtbar als ein Feld, das nie jemand gefüllt hat. */
DELETE FROM `shoot_set_location`
WHERE `kind` = 'motif'
	AND (`name` IS NULL OR trim(`name`) = '')
	AND `address` IS NOT NULL AND trim(`address`) <> '';
