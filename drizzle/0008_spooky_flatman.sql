CREATE TABLE `event_items` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` mediumtext NOT NULL,
	`category` varchar(100) NOT NULL,
	`event_start` date NOT NULL,
	`location` varchar(255) NOT NULL,
	`registration_open` boolean NOT NULL DEFAULT false,
	`demo_content` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_items_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` mediumtext NOT NULL,
	`content` mediumtext NOT NULL,
	`category` varchar(100) NOT NULL,
	`news_date` date NOT NULL,
	`image_url` mediumtext NOT NULL,
	`image_storage_key` varchar(512) NOT NULL,
	`location` varchar(255),
	`demo_content` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `news_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_items_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `event_items_published_idx` ON `event_items` (`published`);--> statement-breakpoint
CREATE INDEX `event_items_event_start_idx` ON `event_items` (`event_start`);--> statement-breakpoint
CREATE INDEX `event_items_sort_order_idx` ON `event_items` (`sort_order`);--> statement-breakpoint
CREATE INDEX `news_items_published_idx` ON `news_items` (`published`);--> statement-breakpoint
CREATE INDEX `news_items_news_date_idx` ON `news_items` (`news_date`);--> statement-breakpoint
CREATE INDEX `news_items_sort_order_idx` ON `news_items` (`sort_order`);
