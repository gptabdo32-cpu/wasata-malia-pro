import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { otpChallenges } from "../db/schema";

function hash(code: string) {
  return crypto.createHash("sha256").update(code).digest("base64url");
}

export async function createOtpChallenge(userId: number, ttlMs = 5 * 60_000) {
  const db = await getDb();
  const code = String(crypto.randomInt(100000, 1000000));
  const challengeId = crypto.randomUUID();
  const codeHash = hash(code);
  const expiresAt = new Date(Date.now() + ttlMs);

  // Use upsert logic for the unique userId
  await db
    .insert(otpChallenges)
    .values({
      userId,
      challengeId,
      codeHash,
      expiresAt,
      attempts: 0,
    })
    .onDuplicateKeyUpdate({
      set: {
        challengeId,
        codeHash,
        expiresAt,
        attempts: 0,
        updatedAt: new Date(),
      },
    });

  return { challengeId, code };
}

export async function verifyOtpChallenge(userId: number, code: string) {
  const db = await getDb();
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(eq(otpChallenges.userId, userId))
    .limit(1);

  if (!challenge) return { ok: false as const, reason: "missing" as const };

  if (challenge.expiresAt.getTime() < Date.now()) {
    await db.delete(otpChallenges).where(eq(otpChallenges.userId, userId));
    return { ok: false as const, reason: "expired" as const };
  }

  const providedHash = hash(code.trim());
  const expected = Buffer.from(challenge.codeHash);
  const actual = Buffer.from(providedHash);
  const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!ok) {
    const newAttempts = challenge.attempts + 1;
    if (newAttempts >= 5) {
      await db.delete(otpChallenges).where(eq(otpChallenges.userId, userId));
    } else {
      await db
        .update(otpChallenges)
        .set({ attempts: newAttempts })
        .where(eq(otpChallenges.userId, userId));
    }
    return { ok: false as const, reason: "mismatch" as const };
  }

  await db.delete(otpChallenges).where(eq(otpChallenges.userId, userId));
  return { ok: true as const, challengeId: challenge.challengeId };
}

export async function clearOtpChallengesForTests() {
  const db = await getDb();
  await db.delete(otpChallenges);
}
