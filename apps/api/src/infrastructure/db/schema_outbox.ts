import { int, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Outbox Table (Enhanced)
 * Stores events that need to be reliably processed by external systems.
 * Implements the Outbox Pattern with Idempotency and Versioning.
 */
export const outboxEvents = mysqlTable("outbox_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 64 }).notNull().unique(), // UUID for global event tracking
  aggregateType: varchar("aggregateType", { length: 100 }).notNull(), // e.g., "escrow", "dispute"
  aggregateId: int("aggregateId").notNull(), // ID of the related entity
  eventType: varchar("eventType", { length: 100 }).notNull(), // e.g., "EscrowLocked"
  version: int("version").default(1).notNull(), // Event schema version
  payload: json("payload").notNull(), // JSON payload containing event data
  correlationId: varchar("correlationId", { length: 64 }).notNull(), // Links all events in a single business flow
  causationId: varchar("causationId", { length: 64 }), // The ID of the event or command that caused THIS event
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(), // Prevents duplicate processing
  status: varchar("status", { length: 50 }).default("pending").notNull(), // "pending", "processing", "completed", "failed", "dead_letter"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  retries: int("retries").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  error: text("error"), // Stores error message if processing fails
});

export type OutboxEvent = typeof outboxEvents.$inferSelect;

/**
 * Idempotency Records Table (Improvement 4, 11)
 * Tracks processed events to detect and handle duplicates.
 * Ensures idempotent event processing at the consumer level.
 */
export const idempotencyRecords = mysqlTable("idempotency_records", {
  id: int("id").autoincrement().primaryKey(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
  eventId: varchar("eventId", { length: 64 }).notNull(),
  aggregateId: varchar("aggregateId", { length: 64 }).notNull(),
  aggregateType: varchar("aggregateType", { length: 100 }).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  correlationId: varchar("correlationId", { length: 64 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // "PROCESSING", "COMPLETED", "FAILED"
  result: json("result"), // Serialized result for completed events
  error: text("error"), // Error message for failed events
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt").notNull(), // For automatic cleanup (24 hours)
});

export type IdempotencyRecord = typeof idempotencyRecords.$inferSelect;
