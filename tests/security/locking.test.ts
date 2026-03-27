import { describe, expect, it, beforeEach } from "vitest";
import { DistributedLock, clearLockRegistryForTests } from "../../apps/api/src/infrastructure/locking";

describe("DistributedLock", () => {
  beforeEach(() => {
    clearLockRegistryForTests();
  });

  it("serializes access to the same resource", async () => {
    const lockA = new DistributedLock("wallet:1", 1000);
    const lockB = new DistributedLock("wallet:1", 1000);

    await expect(lockA.acquire()).resolves.toBe(true);
    let acquiredB = false;
    const attemptB = lockB.acquire(50).then((ok) => { acquiredB = ok; return ok; });
    await expect(attemptB).resolves.toBe(false);
    expect(acquiredB).toBe(false);

    await expect(lockA.release()).resolves.toBe(true);
    await expect(lockB.acquire()).resolves.toBe(true);
    await expect(lockB.release()).resolves.toBe(true);
  });

  it("supports withLock and releases on success", async () => {
    const result = await DistributedLock.withLock("escrow:42", async () => "ok", 1000);
    expect(result).toBe("ok");

    const lock = new DistributedLock("escrow:42", 1000);
    await expect(lock.acquire()).resolves.toBe(true);
    await expect(lock.release()).resolves.toBe(true);
  });
});
