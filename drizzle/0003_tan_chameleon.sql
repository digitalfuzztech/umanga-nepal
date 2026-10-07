ALTER TABLE `our_work_items` ADD `slug` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `our_work_items` ADD CONSTRAINT `our_work_items_slug_unique` UNIQUE(`slug`);