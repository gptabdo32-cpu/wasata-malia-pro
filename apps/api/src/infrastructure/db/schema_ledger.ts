import { int, mysqlTable, varchar, decimal, timestamp } from "drizzle-orm/mysql-core";

export const ledgerAccounts = mysqlTable("ledger_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const ledgerTransactions = mysqlTable("ledger_transactions", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  referenceType: varchar("referenceType", { length: 100 }).notNull(),
  referenceId: int("referenceId").notNull(),
  escrowContractId: int("escrowContractId"),
  isSystemTransaction: int("isSystemTransaction").default(0).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ledgerEntries = mysqlTable("ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: int("transactionId").notNull(),
  accountId: int("accountId").notNull(),
  escrowContractId: int("escrowContractId"),
  debit: decimal("debit", { precision: 15, scale: 4 }).default("0.0000").notNull(),
  credit: decimal("credit", { precision: 15, scale: 4 }).default("0.0000").notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 15, scale: 4 }).default("0.0000").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const accountBalancesCache = mysqlTable("account_balances_cache", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().unique(),
  balance: decimal("balance", { precision: 15, scale: 4 }).default("0.0000").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
