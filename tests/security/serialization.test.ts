import { describe, expect, it } from "vitest";
import { EventBus } from "../../apps/api/src/infrastructure/events";
import { EventSecurity } from "../../apps/api/src/infrastructure/security";

describe("serialization and event identity", () => {
  it("signs equivalent payloads identically regardless of key order", () => {
    const a = { id: 1, amount: "10.00", meta: { currency: "USD", note: "invoice" } };
    const b = { meta: { note: "invoice", currency: "USD" }, amount: "10.00", id: 1 };

    expect(EventSecurity.sign(a)).toBe(EventSecurity.sign(b));
  });

  it("deduplicates semantically identical events without an explicit idempotency key", async () => {
    const bus = new EventBus();
    const seen: Array<string> = [];
    bus.subscribe("order.updated", (event) => {
      seen.push(JSON.stringify(event.payload));
    });

    const first = await bus.publish({ type: "order.updated", payload: { id: 7, status: "paid" } });
    const second = await bus.publish({ type: "order.updated", payload: { status: "paid", id: 7 } });

    expect(first.duplicate).toBe(false);
    expect(second).toMatchObject({ duplicate: true, delivered: 0 });
    expect(seen).toHaveLength(1);
  });
});
