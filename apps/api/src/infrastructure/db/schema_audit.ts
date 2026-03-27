import { auditLogs } from "./schema";

export { auditLogs };
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
