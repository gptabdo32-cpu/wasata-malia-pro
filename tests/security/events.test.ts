import { beforeEach, describe, expect, it } from "vitest";
import { EventBus, getDefaultEventBus } from "../../apps/api/src/infrastructure/events";

describe("EventBus", () => {
  it("delivers events and deduplicates idempotent publishes", async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe("escrow.created", async (event) => {
      seen.push(String((event.payload as any).id));
    });

    const first = await bus.publish({ type: "escrow.created", payload: { id: 7 }, idempotencyKey: "evt-1" });
    const second = await bus.publish({ type: "escrow.created", payload: { id: 7 }, idempotencyKey: "evt-1" });

    expect(first).toMatchObject({ delivered: 1, duplicate: false });
    expect(second).toMatchObject({ delivered: 0, duplicate: true });
    expect(seen).toEqual(["7"]);
  });

  it("captures failing handlers in the dead letter queue", async () => {
    const bus = new EventBus();
    bus.subscribe("risk.alert", () => {
      throw new Error("boom");
    });

    await expect(bus.publish({ type: "risk.alert", payload: { level: "high" } })).rejects.toThrow("Event delivery failed");
    const deadLetters = bus.drainDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0].error).toBe("boom");
  });

  it("replays history for a given type", async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe("chat.message", (event) => {
      seen.push(String((event.payload as any).text));
    });

    await bus.publish({ type: "chat.message", payload: { text: "hello" } });
    await bus.replay("chat.message");

    expect(seen).toEqual(["hello", "hello"]);
  });
});

describe("default event bus singleton", () => {
  beforeEach(() => {
    // No-op; the singleton is intentionally shared, but this keeps the suite explicit.
  });

  it("is available for application wiring", () => {
    expect(getDefaultEventBus()).toBeInstanceOf(EventBus);
  });
});
