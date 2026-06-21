CREATE TABLE `allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`quotation_line_id` text NOT NULL,
	`invoice_line_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`quoted_unit_price_minor` integer NOT NULL,
	`quotation_revision` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`quotation_line_id`) REFERENCES `document_lines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`invoice_line_id`) REFERENCES `document_lines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `allocations_quote_line_idx` ON `allocations` (`quotation_line_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `allocations_invoice_line_unique` ON `allocations` (`invoice_line_id`);--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`personal_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`payment_instructions` text,
	`accent_color` text DEFAULT '#18181b' NOT NULL,
	`logo_key` text,
	`timezone` text DEFAULT 'Asia/Bangkok' NOT NULL,
	`default_currency` text DEFAULT 'USD' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`notes` text,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE TABLE `document_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit` text NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`source_quotation_line_id` text,
	`source_quotation_revision` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_lines_document_idx` ON `document_lines` (`document_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_lines_position_unique` ON `document_lines` (`document_id`,`position`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`lifecycle` text DEFAULT 'draft' NOT NULL,
	`number` text,
	`sequence_year` integer,
	`sequence_number` integer,
	`revision` integer DEFAULT 0 NOT NULL,
	`customer_snapshot` text NOT NULL,
	`sender_snapshot` text NOT NULL,
	`title` text NOT NULL,
	`issue_date` text,
	`sent_at` integer,
	`valid_until` text,
	`due_date` text,
	`quotation_response` text,
	`notes` text,
	`terms` text,
	`voided_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `documents_project_idx` ON `documents` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `documents_number_unique` ON `documents` (`number`);--> statement-breakpoint
CREATE TABLE `number_sequences` (
	`document_type` text NOT NULL,
	`year` integer NOT NULL,
	`next_number` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `number_sequences_type_year_unique` ON `number_sequences` (`document_type`,`year`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`received_on` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `payments_invoice_idx` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`currency` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_on` text,
	`completed_on` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `projects_customer_idx` ON `projects` (`customer_id`);