-- Migration: Add Live Mediator Feature
-- This migration adds support for live mediator functionality in chat conversations

-- Table: mediator_requests
-- Stores requests for mediator assistance during disputes
CREATE TABLE IF NOT EXISTS `mediator_requests` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversationId` int NOT NULL,
  `escrowId` int NOT NULL,
  `requestedBy` int NOT NULL,
  `mediatorId` int,
  `status` enum('pending', 'accepted', 'active', 'resolved', 'cancelled') NOT NULL DEFAULT 'pending',
  `fee` decimal(15, 2) NOT NULL DEFAULT 10.00,
  `feeTransactionId` int,
  `reason` text,
  `requestedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `acceptedAt` timestamp,
  `resolvedAt` timestamp,
  `resolution` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY `conversationId` (`conversationId`),
  KEY `escrowId` (`escrowId`),
  KEY `requestedBy` (`requestedBy`),
  KEY `mediatorId` (`mediatorId`),
  KEY `status` (`status`)
);

-- Table: mediator_messages
-- Stores messages sent by mediators in conversations
CREATE TABLE IF NOT EXISTS `mediator_messages` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `mediatorRequestId` int NOT NULL,
  `conversationId` int NOT NULL,
  `senderId` int NOT NULL,
  `messageType` enum('text', 'decision', 'freeze', 'unfreeze', 'evidence_request') NOT NULL DEFAULT 'text',
  `content` text NOT NULL,
  `isSystemMessage` boolean NOT NULL DEFAULT false,
  `canBeDeleted` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  KEY `mediatorRequestId` (`mediatorRequestId`),
  KEY `conversationId` (`conversationId`),
  KEY `senderId` (`senderId`),
  KEY `messageType` (`messageType`)
);

-- Table: mediator_private_chats
-- Stores private conversations between mediator and individual parties
CREATE TABLE IF NOT EXISTS `mediator_private_chats` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `mediatorRequestId` int NOT NULL,
  `mediatorId` int NOT NULL,
  `userId` int NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `unique_mediator_user` (`mediatorRequestId`, `userId`),
  KEY `mediatorId` (`mediatorId`),
  KEY `userId` (`userId`)
);

-- Table: mediator_private_messages
-- Stores messages in private mediator chats
CREATE TABLE IF NOT EXISTS `mediator_private_messages` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `privateChatId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text NOT NULL,
  `messageType` enum('text', 'image', 'audio', 'file') NOT NULL DEFAULT 'text',
  `mediaUrl` text,
  `mediaType` varchar(50),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  KEY `privateChatId` (`privateChatId`),
  KEY `senderId` (`senderId`)
);

-- Table: mediator_decisions
-- Stores final decisions made by mediators
CREATE TABLE IF NOT EXISTS `mediator_decisions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `mediatorRequestId` int NOT NULL,
  `escrowId` int NOT NULL,
  `mediatorId` int NOT NULL,
  `decisionType` enum('release_to_seller', 'refund_to_buyer', 'split', 'custom') NOT NULL,
  `buyerAmount` decimal(15, 2),
  `sellerAmount` decimal(15, 2),
  `reason` text NOT NULL,
  `evidence` json,
  `isAppealed` boolean NOT NULL DEFAULT false,
  `appealReason` text,
  `finalDecision` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY `mediatorRequestId` (`mediatorRequestId`),
  KEY `escrowId` (`escrowId`),
  KEY `mediatorId` (`mediatorId`),
  KEY `decisionType` (`decisionType`)
);

-- Table: mediator_freeze_logs
-- Tracks when escrows are frozen by mediators
CREATE TABLE IF NOT EXISTS `mediator_freeze_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `mediatorRequestId` int NOT NULL,
  `escrowId` int NOT NULL,
  `mediatorId` int NOT NULL,
  `frozenAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unfrozenAt` timestamp,
  `reason` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  KEY `mediatorRequestId` (`mediatorRequestId`),
  KEY `escrowId` (`escrowId`),
  KEY `mediatorId` (`mediatorId`)
);

-- Add new columns to users table for mediator role
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `isMediator` boolean NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mediatorRating` decimal(3, 2) DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mediatorCasesResolved` int DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mediatorIsAvailable` boolean NOT NULL DEFAULT false;

-- Add new columns to chatConversations table
ALTER TABLE `chatConversations` ADD COLUMN IF NOT EXISTS `hasMediator` boolean NOT NULL DEFAULT false;
ALTER TABLE `chatConversations` ADD COLUMN IF NOT EXISTS `mediatorRequestId` int;
ALTER TABLE `chatConversations` ADD COLUMN IF NOT EXISTS `mediatorId` int;
ALTER TABLE `chatConversations` ADD COLUMN IF NOT EXISTS `isFrozen` boolean NOT NULL DEFAULT false;
ALTER TABLE `chatConversations` ADD COLUMN IF NOT EXISTS `frozenReason` text;

-- Add new columns to chatMessages table for mediator tracking
ALTER TABLE `chatMessages` ADD COLUMN IF NOT EXISTS `isMediatorMessage` boolean NOT NULL DEFAULT false;
ALTER TABLE `chatMessages` ADD COLUMN IF NOT EXISTS `canBeDeleted` boolean NOT NULL DEFAULT true;
ALTER TABLE `chatMessages` ADD COLUMN IF NOT EXISTS `mediatorRequestId` int;
