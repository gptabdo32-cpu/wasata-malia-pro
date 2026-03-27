import { describe, expect, it } from "vitest";
import { EventSecurity, signJWT, verifyJWT } from "../../apps/api/src/infrastructure/security";
import { encryptData, decryptData } from "../../apps/api/src/infrastructure/external-services/encryption.js";
import { rulesEngine } from "../../apps/api/src/infrastructure/external-services/rulesEngine.js";

describe("security v10.0 smoke", () => {
  it("signs and verifies jwt", async () => {
    const token = await signJWT({ id: 7, role: "admin" });
    const payload = await verifyJWT(token);
    expect(payload?.id).toBe(7);
    expect(payload?.role).toBe("admin");
  });

  it("event signatures reject tampering", () => {
    const payload = { escrowId: 1, amount: "10.00" };
    const sig = EventSecurity.sign(payload);
    expect(EventSecurity.validate(payload, sig)).toBe(true);
    expect(EventSecurity.validate({ ...payload, amount: "11.00" }, sig)).toBe(false);
  });

  it("encrypts and decrypts payloads with authenticated encryption", () => {
    const clear = JSON.stringify({ latitude: 1, longitude: 2 });
    const encrypted = encryptData(clear);
    expect(encrypted).not.toContain(clear);
    expect(decryptData(encrypted)).toBe(clear);
  });

  it("evaluates rules deterministically", () => {
    rulesEngine.setRules([
      { field: "temperature", operator: "gt", value: 10 },
      { field: "status", operator: "eq", value: "active" },
    ]);
    const matches = rulesEngine.getMatchingRules({ temperature: 11, status: "active" });
    expect(matches).toHaveLength(2);
    rulesEngine.clear();
  });
});
