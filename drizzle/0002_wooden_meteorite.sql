CREATE TABLE `our_work_items` (
	`id` varchar(36) NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`tags` json NOT NULL,
	`image_url` text NOT NULL,
	`image_storage_key` varchar(512) NOT NULL,
	`about_program` text,
	`what_we_cover` json NOT NULL,
	`awareness_session_count` int,
	`participant_count` int,
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `our_work_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `our_work_items_published_idx` ON `our_work_items` (`published`);--> statement-breakpoint
CREATE INDEX `our_work_items_sort_order_idx` ON `our_work_items` (`sort_order`);--> statement-breakpoint
CREATE INDEX `our_work_items_created_at_idx` ON `our_work_items` (`created_at`);--> statement-breakpoint
CREATE INDEX `our_work_items_type_idx` ON `our_work_items` (`type`);