CREATE TABLE `adminLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50) NOT NULL,
	`targetId` int NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `digitalProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`thumbnailUrl` text,
	`previewUrl` text,
	`deliveryType` enum('instant','manual','email') NOT NULL DEFAULT 'manual',
	`productCodes` json,
	`isActive` boolean DEFAULT true,
	`averageRating` decimal(3,2) DEFAULT '0',
	`totalReviews` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digitalProducts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `escrows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`buyerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`commissionPercentage` decimal(5,2) NOT NULL DEFAULT '2.5',
	`commissionAmount` decimal(15,2) NOT NULL,
	`commissionPaidBy` enum('buyer','seller','split') NOT NULL DEFAULT 'buyer',
	`dealType` enum('physical','digital_account','service') NOT NULL DEFAULT 'physical',
	`specifications` json,
	`status` enum('draft','funded','delivered','completed','disputed','cancelled') NOT NULL DEFAULT 'draft',
	`fundedAt` timestamp,
	`deliveredAt` timestamp,
	`completedAt` timestamp,
	`disputeRaisedAt` timestamp,
	`disputeRaisedBy` int,
	`disputeReason` text,
	`disputeResolution` text,
	`disputeResolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escrows_id` PRIMARY KEY(`id`)
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
CREATE TABLE `platformSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platformName` varchar(255) NOT NULL DEFAULT 'وثّقلي',
	`platformDescription` text,
	`contactEmail` varchar(320),
	`supportPhone` varchar(20),
	`escrowCommissionPercentage` decimal(5,2) NOT NULL DEFAULT '2.5',
	`productCommissionPercentage` decimal(5,2) NOT NULL DEFAULT '5.0',
	`minWithdrawalAmount` decimal(15,2) NOT NULL DEFAULT '10.0',
	`isRegistrationEnabled` boolean DEFAULT true,
	`isEscrowEnabled` boolean DEFAULT true,
	`isProductMarketplaceEnabled` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`buyerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`quantity` int NOT NULL,
	`pricePerUnit` decimal(15,2) NOT NULL,
	`totalPrice` decimal(15,2) NOT NULL,
	`commissionPercentage` decimal(5,2) NOT NULL DEFAULT '2.5',
	`commissionAmount` decimal(15,2) NOT NULL,
	`deliveredCodes` json,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`revieweeId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`escrowId` int,
	`productPurchaseId` int,
	`rating` int NOT NULL,
	`comment` text,
	`reviewType` enum('seller','buyer','product') NOT NULL,
	`sellerResponse` text,
	`sellerResponseAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','withdrawal','commission','refund','transfer') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`escrowId` int,
	`productPurchaseId` int,
	`withdrawalRequestId` int,
	`description` text,
	`reference` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustedSellerSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planName` varchar(100) NOT NULL,
	`monthlyPrice` decimal(15,2) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isActive` boolean DEFAULT true,
	`autoRenew` boolean DEFAULT true,
	`benefits` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trustedSellerSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` decimal(15,2) NOT NULL DEFAULT '0',
	`pendingBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`totalEarned` decimal(15,2) NOT NULL DEFAULT '0',
	`totalWithdrawn` decimal(15,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`paymentMethod` enum('sadad','tadawul','edfaali','bank_transfer') NOT NULL,
	`paymentDetails` json,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('buyer','seller','both') DEFAULT 'buyer' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `profileImage` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `isEmailVerified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `isPhoneVerified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `isIdentityVerified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `identityDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `identityVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumberVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isTrustedSeller` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `trustedSellerExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `isSuspended` boolean DEFAULT false;