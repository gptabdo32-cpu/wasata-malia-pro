import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { resolveUserFromRequest } from "../../apps/api/src/infrastructure/auth/session";

function makeRequest(headers: Record<string, string | undefined>) {
  return { headers } as any;
}

describe("session resolution", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("rejects development headers in production mode", async () => {
    process.env.NODE_ENV = "production";
    const user = await resolveUserFromRequest(makeRequest({ "x-user-id": "42", "x-user-role": "admin" }));
    expect(user).toBeNull();
  });

  it("accepts development headers outside production", async () => {
    process.env.NODE_ENV = "development";
    const user = await resolveUserFromRequest(makeRequest({ "x-user-id": "42", "x-user-role": "admin" }));
    expect(user?.id).toBe(42);
    expect(user?.role).toBe("admin");
  });
});
