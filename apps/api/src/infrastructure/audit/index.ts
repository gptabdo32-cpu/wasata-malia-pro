import { getDb } from "../db";
import { auditLogs } from "../db/schema_audit";
import { safeStringify } from "../utils/safeJson";

type AuditEntry = {
  userId: number;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  correlationId?: string;
  metadata?: unknown;
};

function stringifyAuditValue(value: unknown) {
  if (value === undefined) return null;
  const serialized = safeStringify(value);
  return serialized === undefined ? null : serialized;
}

export class AuditLogger {
  static async log(entry: AuditEntry) {
    const db = await getDb();
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action.slice(0, 100),
      entityType: entry.entityType.slice(0, 100),
      entityId: entry.entityId.slice(0, 64),
      oldValue: stringifyAuditValue(entry.oldValue),
      newValue: stringifyAuditValue(entry.newValue),
      correlationId: (entry.correlationId ?? `audit_${Date.now()}`).slice(0, 64),
      metadata: entry.metadata ?? null,
      createdAt: new Date(),
    } as any);
    return { success: true, entry } as const;
  }
}
