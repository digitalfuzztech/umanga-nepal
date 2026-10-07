ALTER TABLE `our_work_items` ADD `advisory_note` text;--> statement-breakpoint
ALTER TABLE `our_work_items` ADD `featured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `our_work_items` ADD `awareness_session_label` varchar(120);--> statement-breakpoint
ALTER TABLE `our_work_items` ADD `awareness_session_note` text;--> statement-breakpoint
ALTER TABLE `our_work_items` ADD `participant_label` varchar(120);--> statement-breakpoint
ALTER TABLE `our_work_items` ADD `participant_note` text;