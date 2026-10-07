CREATE TABLE `story_items` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`attribution` varchar(255) NOT NULL,
	`image_url` text NOT NULL,
	`image_storage_key` varchar(512) NOT NULL,
	`story_date` date,
	`demo_content` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `story_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `story_items_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `story_items_published_idx` ON `story_items` (`published`);--> statement-breakpoint
CREATE INDEX `story_items_sort_order_idx` ON `story_items` (`sort_order`);--> statement-breakpoint
CREATE INDEX `story_items_story_date_idx` ON `story_items` (`story_date`);