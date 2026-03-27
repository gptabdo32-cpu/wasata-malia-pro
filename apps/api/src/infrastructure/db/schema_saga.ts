import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

/**
 * Saga State Table (Rule 8: Store saga state in database)
 * MISSION: Track the state of long-running distributed transactions.
 */
export const sagaStates = mysqlTable("saga_states", {
  id: int("id").autoincrement().primaryKey(),
  sagaId: varchar("sagaId", { length: 64 }).notNull().unique(), // Unique identifier for the saga instance
  type: varchar("type", { length: 100 }).notNull(), // e.g., "PaymentSaga", "EscrowSaga"
  status: mysqlEnum("status", ["STARTED", "PROCESSING", "COMPLETED", "FAILED", "COMPENSATING", "COMPENSATED"]).default("STARTED").notNull(),
  state: json("state").notNull(), // Current state data (e.g., { escrowId: 1, step: 'authorize' })
  correlationId: varchar("correlationId", { length: 64 }).notNull(), // Link all events to this saga
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  version: int("version").default(1).notNull(), // For optimistic concurrency control

  expiresAt: timestamp("expiresAt"), // For cleanup of old sagas
});

export type SagaState = typeof sagaStates.$inferSelect;
export type InsertSagaState = typeof sagaStates.$inferInsert;
