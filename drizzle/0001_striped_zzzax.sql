CREATE TABLE `gallery_items` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`caption` text,
	`image_url` text NOT NULL,
	`image_storage_key` varchar(512) NOT NULL,
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `gallery_items_published_idx` ON `gallery_items` (`published`);--> statement-breakpoint
CREATE INDEX `gallery_items_sort_order_idx` ON `gallery_items` (`sort_order`);--> statement-breakpoint
CREATE INDEX `gallery_items_created_at_idx` ON `gallery_items` (`created_at`);