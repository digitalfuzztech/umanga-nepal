CREATE TABLE `inbox_messages` (
	`id` varchar(36) NOT NULL,
	`thread_id` varchar(36) NOT NULL,
	`direction` enum('inbound','outbound','system') NOT NULL,
	`sender_type` enum('lead','staff','system') NOT NULL,
	`from_address` varchar(320) NOT NULL,
	`to_address` varchar(320) NOT NULL,
	`subject` varchar(998),
	`body` mediumtext NOT NULL,
	`delivery_status` enum('pending','sent','failed'),
	`smtp_message_id` varchar(998),
	`delivery_error_code` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inbox_messages_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `inbox_threads` (
	`id` varchar(36) NOT NULL,
	`channel` enum('contact','newsletter','volunteer','partner','support','invite','stories') NOT NULL,
	`mailbox` varchar(320) NOT NULL,
	`lead_name` varchar(255),
	`lead_email` varchar(320) NOT NULL,
	`lead_phone` varchar(100),
	`subject` varchar(255),
	`metadata` json NOT NULL,
	`status` enum('new','open','resolved') NOT NULL DEFAULT 'new',
	`read_at` datetime,
	`last_message_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inbox_threads_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `inbox_messages` ADD CONSTRAINT `inbox_messages_thread_id_inbox_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `inbox_threads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inbox_messages_thread_created_at_idx` ON `inbox_messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inbox_threads_channel_idx` ON `inbox_threads` (`channel`);--> statement-breakpoint
CREATE INDEX `inbox_threads_status_idx` ON `inbox_threads` (`status`);--> statement-breakpoint
CREATE INDEX `inbox_threads_read_at_idx` ON `inbox_threads` (`read_at`);--> statement-breakpoint
CREATE INDEX `inbox_threads_last_message_at_idx` ON `inbox_threads` (`last_message_at`);--> statement-breakpoint
CREATE INDEX `inbox_threads_created_at_idx` ON `inbox_threads` (`created_at`);--> statement-breakpoint
CREATE INDEX `inbox_threads_lead_email_idx` ON `inbox_threads` (`lead_email`);
