CREATE TABLE `disputeEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escrowId` int NOT NULL,
	`uploaderId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileType` varchar(50),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `disputeEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disputeMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escrowId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `disputeMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('transaction','dispute','system','marketing') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean DEFAULT false,
	`link` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `identityDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `identityVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumberVerifiedAt` timestamp;