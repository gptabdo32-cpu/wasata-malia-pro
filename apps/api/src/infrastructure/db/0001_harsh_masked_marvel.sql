CREATE TABLE `liveness_analysis_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`frameNumber` int NOT NULL,
	`timestamp` int NOT NULL,
	`eyeBlinkDetected` boolean,
	`eyeAspectRatio` decimal(5,3),
	`leftEyeOpen` boolean,
	`rightEyeOpen` boolean,
	`smileDetected` boolean,
	`smileIntensity` decimal(3,2),
	`headYaw` decimal(5,2),
	`headPitch` decimal(5,2),
	`headRoll` decimal(5,2),
	`corneaReflectionDetected` boolean,
	`reflectionCount` int,
	`reflectionStability` decimal(3,2),
	`skinDistortionScore` decimal(3,2),
	`textureAnalysisScore` decimal(3,2),
	`frequencyDomainScore` decimal(3,2),
	`frameScore` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `liveness_analysis_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liveness_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`challenges` text NOT NULL,
	`completedChallenges` text NOT NULL,
	`videoUrl` text,
	`videoKey` varchar(255),
	`videoDuration` int,
	`livenessScore` int,
	`riskScore` int,
	`isLive` boolean,
	`analysisResults` text,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liveness_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `liveness_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `presentation_attack_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`printAttackDetected` boolean,
	`videoReplayDetected` boolean,
	`maskAttackDetected` boolean,
	`deepfakeDetected` boolean,
	`injectionAttackDetected` boolean,
	`printAttackProbability` decimal(3,2),
	`videoReplayProbability` decimal(3,2),
	`maskAttackProbability` decimal(3,2),
	`deepfakeProbability` decimal(3,2),
	`injectionAttackProbability` decimal(3,2),
	`textureAnalysis` text,
	`frequencyAnalysis` text,
	`physiologicalAnalysis` text,
	`overallRiskScore` decimal(5,2),
	`isPresentationAttack` boolean,
	`confidence` decimal(3,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presentation_attack_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users_liveness` (
	`userId` int NOT NULL,
	`livenessVerifiedAt` timestamp,
	`livenessScore` int,
	`lastLivenessSessionId` varchar(64),
	`livenessVerificationCount` int DEFAULT 0,
	`lastLivenessAttemptAt` timestamp,
	`failedLivenessAttempts` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_liveness_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `liveness_analysis_results` ADD CONSTRAINT `liveness_analysis_results_sessionId_liveness_sessions_sessionId_fk` FOREIGN KEY (`sessionId`) REFERENCES `liveness_sessions`(`sessionId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `liveness_sessions` ADD CONSTRAINT `liveness_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `presentation_attack_logs` ADD CONSTRAINT `presentation_attack_logs_sessionId_liveness_sessions_sessionId_fk` FOREIGN KEY (`sessionId`) REFERENCES `liveness_sessions`(`sessionId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users_liveness` ADD CONSTRAINT `users_liveness_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;