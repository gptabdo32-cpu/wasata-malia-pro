import { describe, expect, it, beforeEach } from "vitest";
import { clearOtpChallengesForTests, createOtpChallenge, verifyOtpChallenge } from "../../apps/api/src/infrastructure/auth/otp";

describe("OTP challenges", () => {
  beforeEach(async () => {
    await clearOtpChallengesForTests();
  });

  it("creates and verifies a one-time code", async () => {
    const { challengeId, code } = await createOtpChallenge(7);
    expect(challengeId).toMatch(/[0-9a-f-]{10,}/i);
    expect(await verifyOtpChallenge(7, code)).toEqual({ ok: true, challengeId });
    expect(await verifyOtpChallenge(7, code)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects incorrect codes and expires after repeated failures", async () => {
    await createOtpChallenge(11);
    expect(await verifyOtpChallenge(11, "000000")).toEqual({ ok: false, reason: "mismatch" });
    expect(await verifyOtpChallenge(11, "111111")).toEqual({ ok: false, reason: "mismatch" });
  });
});
