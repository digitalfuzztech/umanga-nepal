CREATE TABLE `resource_items` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` mediumtext NOT NULL,
	`content` mediumtext NOT NULL,
	`category` varchar(100) NOT NULL,
	`type` varchar(50) NOT NULL,
	`reading_time` int,
	`published_at` date,
	`reviewed_at` date,
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resource_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_items_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `resource_items_published_idx` ON `resource_items` (`published`);--> statement-breakpoint
CREATE INDEX `resource_items_sort_order_idx` ON `resource_items` (`sort_order`);
