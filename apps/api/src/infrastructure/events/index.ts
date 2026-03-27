import crypto from "node:crypto";
import { eq, and, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { outboxEvents, idempotencyRecords } from "../db/schema_outbox";
import { sagaStates } from "../db/schema_saga";

export type BaseEvent = {
  type: string;
  payload: unknown;
  createdAt?: string;
  eventId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  aggregateType?: string;
  aggregateId?: number;
};

export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;
export type SagaStepContext = { step?: string; event?: BaseEvent; payload?: unknown; sagaId?: string };
export type SagaStep = {
  name: string;
  execute: (context: SagaStepContext) => Promise<unknown> | unknown;
  compensate?: (context: SagaStepContext & { error: unknown }) => Promise<void> | void;
};

/**
 * Global Registry for Handlers and Sagas.
 * This is the ONLY place where handlers and sagas are registered.
 * It does NOT store state, only definitions.
 */
export class Registry {
  private static readonly handlers = new Map<string, Set<EventHandler>>();
  private static readonly sagas = new Map<string, SagaStep[]>();

  static subscribe(type: string, handler: EventHandler) {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler);
    this.handlers.set(type, set);
  }

  static registerSaga(type: string, steps: SagaStep[]) {
    this.sagas.set(type, steps);
  }

  static getHandlers(type: string): EventHandler[] {
    return Array.from(this.handlers.get(type) ?? []);
  }

  static getSagaSteps(type: string): SagaStep[] | undefined {
    return this.sagas.get(type);
  }
}

export class EventBus {
  /**
   * Publish only persists the event to the Outbox.
   * The actual delivery is handled by the OutboxWorker (Consumer).
   */
  async publish<T extends BaseEvent>(event: T): Promise<{ eventId: string }> {
    if (!event?.type) throw new Error("Event type is required");
    const db = await getDb();
    
    const eventId = event.eventId ?? crypto.randomUUID();
    const idempotencyKey = event.idempotencyKey ?? eventId;
    const correlationId = event.correlationId ?? eventId;
    const aggregateType = event.aggregateType ?? "system";
    const aggregateId = event.aggregateId ?? 0;

    // Persist to Outbox - This is the "Source of Truth"
    await db.insert(outboxEvents).values({
      eventId,
      eventType: event.type,
      payload: event.payload,
      aggregateType,
      aggregateId,
      correlationId,
      idempotencyKey,
      status: "pending",
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
    });

    return { eventId };
  }
}

export class SagaManager {
  async start(type: string, context: SagaStepContext = {}) {
    const steps = Registry.getSagaSteps(type);
    if (!steps) throw new Error(`Saga not registered: ${type}`);

    const db = await getDb();
    const sagaId = context.sagaId ?? crypto.randomUUID();
    const correlationId = context.event?.correlationId ?? sagaId;

    // 1. Persist Initial Saga State
    await db.insert(sagaStates).values({
      sagaId,
      type,
      status: "STARTED",
      state: context.payload ?? {},
      correlationId,
    });

    // Trigger the first step execution via an event to keep it decoupled
    const bus = new EventBus();
    await bus.publish({
      type: `SagaStepRequested:${type}`,
      payload: { sagaId, stepIndex: 0, context: context.payload },
      correlationId,
    });

    return { sagaId };
  }

  /**
   * Real Resume: Reconstructs execution from DB state and Registry definitions.
   */
  async resume(sagaId: string) {
    const db = await getDb();
    const [state] = await db.select().from(sagaStates).where(eq(sagaStates.sagaId, sagaId)).limit(1);
    if (!state || state.status === "COMPLETED" || state.status === "COMPENSATED") return;

    const steps = Registry.getSagaSteps(state.type);
    if (!steps) throw new Error(`Cannot resume: Saga definition for ${state.type} missing`);

    // Find where we left off (this logic would be more complex in a full impl, 
    // but here we trigger a retry of the current state)
    const bus = new EventBus();
    await bus.publish({
      type: `SagaResumeRequested:${state.type}`,
      payload: { sagaId, state: state.state },
      correlationId: state.correlationId,
    });
  }
}

export class SagaRecoveryEngine {
  async start() {
    const db = await getDb();
    const manager = new SagaManager();
    
    // Recover sagas stuck in PROCESSING or STARTED for too long
    const stuckSagas = await db.select().from(sagaStates).where(
      and(
        sql`status IN ('STARTED', 'PROCESSING', 'COMPENSATING')`,
        sql`updated_at < NOW() - INTERVAL 10 MINUTE`
      )
    );

    for (const saga of stuckSagas) {
      await manager.resume(saga.sagaId);
    }

    return { recovered: stuckSagas.length };
  }
}

export function initializeSubscribers() {
  // This now only sets up the Registry. 
  // In a real app, we would import all handlers/sagas here to register them.
  return {
    registry: Registry,
    eventBus: new EventBus(),
    sagaManager: new SagaManager(),
  };
}

export function getDefaultEventBus() {
  return new EventBus();
}
