CREATE TABLE `gallery_albums` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`caption` text,
	`category` varchar(100) NOT NULL,
	`context_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_albums_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `gallery_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `gallery_items` ADD `category` varchar(100);--> statement-breakpoint
ALTER TABLE `gallery_items` ADD `context_name` varchar(255);--> statement-breakpoint
ALTER TABLE `gallery_items` ADD `album_id` varchar(36);--> statement-breakpoint
ALTER TABLE `gallery_items` ADD `image_width` int;--> statement-breakpoint
ALTER TABLE `gallery_items` ADD `image_height` int;--> statement-breakpoint
CREATE INDEX `gallery_albums_category_idx` ON `gallery_albums` (`category`);--> statement-breakpoint
ALTER TABLE `gallery_items` ADD CONSTRAINT `gallery_items_album_id_gallery_albums_id_fk` FOREIGN KEY (`album_id`) REFERENCES `gallery_albums`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gallery_items_category_idx` ON `gallery_items` (`category`);--> statement-breakpoint
CREATE INDEX `gallery_items_album_id_idx` ON `gallery_items` (`album_id`);--> statement-breakpoint
CREATE INDEX `gallery_items_public_created_idx` ON `gallery_items` (`published`,`created_at`,`id`);
