import { asc, eq, and, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { outboxEvents, idempotencyRecords } from "../db/schema_outbox";
import { Registry, type BaseEvent } from "../events";

/**
 * OutboxWorker: The Independent Consumer.
 * It reads events from the DB and executes handlers from the Registry.
 * It is decoupled from the API process and can run in multiple instances.
 */
export class OutboxWorker {
  private started = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;

  constructor(options: { maxRetries?: number; baseRetryDelayMs?: number } = {}) {
    this.maxRetries = Math.max(1, options.maxRetries ?? 5);
    this.baseRetryDelayMs = Math.max(250, options.baseRetryDelayMs ?? 1_000);
  }

  private shouldProcess(event: { status: string; retries: number | null; lastAttemptAt: Date | null }) {
    if (event.status === "pending") return true;
    if (event.status !== "failed") return false;
    const retries = Number(event.retries ?? 0);
    if (retries >= this.maxRetries) return false;
    if (!event.lastAttemptAt) return true;
    const backoff = Math.min(this.baseRetryDelayMs * 2 ** Math.max(0, retries - 1), 60_000);
    return Date.now() - new Date(event.lastAttemptAt).getTime() >= backoff;
  }

  async drainOnce(limit = 50) {
    const db = await getDb();
    
    // 1. Fetch candidates from DB
    const candidates = await db
      .select()
      .from(outboxEvents)
      .where(
        or(
          eq(outboxEvents.status, "pending"),
          and(
            eq(outboxEvents.status, "failed"),
            sql`${outboxEvents.retries} < ${this.maxRetries}`
          )
        )
      )
      .orderBy(asc(outboxEvents.createdAt))
      .limit(limit);

    const pending = candidates.filter((event) => this.shouldProcess(event));

    let processed = 0;
    for (const event of pending) {
      const retries = Number(event.retries ?? 0) + 1;
      const idempotencyKey = event.idempotencyKey;

      try {
        // 2. Optimistic Lock / Idempotency Check
        const [existingRecord] = await db
          .select()
          .from(idempotencyRecords)
          .where(eq(idempotencyRecords.idempotencyKey, idempotencyKey))
          .limit(1);

        if (existingRecord && existingRecord.status === "COMPLETED") {
          await db.update(outboxEvents)
            .set({ status: "completed", processedAt: new Date() })
            .where(eq(outboxEvents.id, event.id));
          continue;
        }

        // 3. Mark as Processing
        await db.update(outboxEvents)
          .set({ status: "processing", lastAttemptAt: new Date(), retries })
          .where(eq(outboxEvents.id, event.id));

        if (!existingRecord) {
          await db.insert(idempotencyRecords).values({
            idempotencyKey,
            eventId: event.eventId,
            aggregateId: String(event.aggregateId),
            aggregateType: event.aggregateType,
            eventType: event.eventType,
            correlationId: event.correlationId,
            status: "PROCESSING",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
        }

        // 4. Get Handlers from Registry (Decoupled Registry)
        const handlers = Registry.getHandlers(event.eventType);
        const normalizedEvent: BaseEvent = {
          type: event.eventType,
          payload: event.payload,
          createdAt: event.createdAt.toISOString(),
          eventId: event.eventId,
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
        };

        const failures: string[] = [];
        for (const handler of handlers) {
          try {
            await handler(normalizedEvent);
          } catch (error) {
            failures.push(error instanceof Error ? error.message : String(error));
          }
        }

        // 5. Finalize Status
        if (failures.length === 0) {
          await db.update(outboxEvents)
            .set({ status: "completed", processedAt: new Date(), lastAttemptAt: new Date(), error: null })
            .where(eq(outboxEvents.id, event.id));
          
          await db.update(idempotencyRecords)
            .set({ status: "COMPLETED", completedAt: new Date() })
            .where(eq(idempotencyRecords.idempotencyKey, idempotencyKey));
          
          processed += 1;
        } else {
          throw new Error(failures.join("; "));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const exhausted = retries >= this.maxRetries;
        
        await db.update(outboxEvents)
          .set({
            status: exhausted ? "dead_letter" : "failed",
            lastAttemptAt: new Date(),
            retries,
            error: message,
          })
          .where(eq(outboxEvents.id, event.id));

        await db.update(idempotencyRecords)
          .set({ status: "FAILED", error: message })
          .where(eq(idempotencyRecords.idempotencyKey, idempotencyKey));
      }
    }

    return { processed, remaining: Math.max(0, candidates.length - processed) } as const;
  }

  start(intervalMs = 5_000) {
    if (this.started) return { started: true, intervalMs };
    this.started = true;
    this.timer = setInterval(() => {
      void this.drainOnce().catch(() => undefined);
    }, intervalMs);
    return { started: true, intervalMs };
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
    return { stopped: true } as const;
  }
}
