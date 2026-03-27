import { createHash } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { ENV as ConfigEnv } from "../../infrastructure/config/env";
import { users, reviews, transactions } from "../../infrastructure/db/schema";
import { createOtpChallenge, verifyOtpChallenge } from "../../infrastructure/auth/otp";
import { riskEngine } from "../../infrastructure/risk/RiskEngine";
import { protectedProcedure, router } from "../trpc/trpc";
import { getCurrentUserRow } from "./routerShared.identity";
import { assertParticipantOrAdmin } from "../../infrastructure/policy/access";

type TrustSignals = {
  verifiedSeller?: boolean;
};

export const verifyRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const row = await getCurrentUserRow(ctx.user.id);
    return {
      isIdentityVerified: row?.kycStatus === "verified",
      verificationLevel: row?.kycStatus === "verified" ? 2 : row?.phoneVerifiedAt ? 1 : 0,
      kycStatus: row?.kycStatus ?? "none",
      phoneVerified: Boolean(row?.phoneVerifiedAt),
      emailPresent: Boolean(row?.email),
      emailVerified: false,
      identityVerifiedAt: row?.identityVerifiedAt ?? null,
    };
  }),
  sendOtp: protectedProcedure.input(z.object({ phone: z.string().trim().min(5).max(20).optional() }).default({})).mutation(async ({ ctx, input }) => {
    const { challengeId, code } = await createOtpChallenge(ctx.user.id);
    const db = await getDb();
    if (input.phone) {
      await db.update(users).set({ phone: input.phone.trim(), updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
    }
    return {
      success: true,
      sentTo: input.phone ? "phone" : "device",
      challengeId,
      code: ConfigEnv.isProduction ? undefined : code,
    } as const;
  }),
  checkOtp: protectedProcedure.input(z.object({ code: z.string().length(6), phone: z.string().trim().min(5).max(20).optional() }).default({ code: "" })).mutation(async ({ ctx, input }) => {
    const result = await verifyOtpChallenge(ctx.user.id, input.code);
    if (!result.ok) {
      throw new Error("Invalid OTP");
    }
    const db = await getDb();
    await db.update(users).set({
      phone: input.phone ? input.phone.trim() : undefined,
      phoneVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, ctx.user.id));
    return { success: true, verified: true, phoneVerified: true } as const;
  }),
});

export const trustRouter = router({
  getTrustProfile: protectedProcedure.input(z.object({ userId: z.number().int().positive().optional() }).default({})).query(async ({ ctx, input }) => {
    const userId = input.userId ?? ctx.user.id;
    assertParticipantOrAdmin(ctx.user, [userId]);
    const profile = await riskEngine.buildTrustProfile(userId);
    const db = await getDb();
    const userReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.revieweeId, userId));
    const averageRating = userReviews.length ? userReviews.reduce((sum, row) => sum + Number(row.rating), 0) / userReviews.length : 0;
    const completedTxCount = await db.select({ total: count() }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.status, "completed")));
    const allTxCount = await db.select({ total: count() }).from(transactions).where(eq(transactions.userId, userId));
    return {
      userId,
      score: {
        currentScore: String(profile.trustScore),
        successfulTransactionsCount: Number(completedTxCount[0]?.total ?? 0),
        totalTransactionsCount: Number(allTxCount[0]?.total ?? 0),
      },
      badges: [profile.riskTier, ...((profile.signals as TrustSignals).verifiedSeller ? ["trusted_seller"] : [])],
      risk: profile,
      averageRating: Number(averageRating.toFixed(2)),
    };
  }),
});

export const behavioralRouter = router({
  getPatternStatus: protectedProcedure.query(async ({ ctx }) => {
    const profile = await riskEngine.buildTrustProfile(ctx.user.id);
    const locked = profile.riskTier === "critical" || profile.riskScore < 35;
    const fingerprint = createHash("sha256").update(`${ctx.user.id}:${ctx.req.headers["user-agent"] ?? "unknown"}`).digest("hex").slice(0, 24);
    return { isLocked: locked, riskTier: profile.riskTier, riskScore: profile.riskScore, trustScore: profile.trustScore, patternHash: fingerprint, lastCheckedAt: new Date().toISOString() };
  }),
});
