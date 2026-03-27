import { and, count, desc, eq, gte, or } from "drizzle-orm";
import { getDb } from "../../infrastructure/db";
import { users, wallets, escrows, disputes, reviews, trustedSellerSubscriptions } from "../db/schema";

export type RiskTier = "low" | "moderate" | "high" | "critical";

export type TrustProfile = {
  userId: number;
  riskScore: number;
  riskTier: RiskTier;
  trustScore: number;
  flags: string[];
  controls: {
    payoutHoldHours: number;
    manualReviewRequired: boolean;
    maxSingleTransfer?: string;
  };
  signals: Record<string, unknown>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export class RiskEngine {
  async buildTrustProfile(userId: number): Promise<TrustProfile> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return {
        userId,
        riskScore: 100,
        riskTier: "critical",
        trustScore: 0,
        flags: ["unknown_user"],
        controls: { payoutHoldHours: 168, manualReviewRequired: true, maxSingleTransfer: "0.00" },
        signals: {},
      };
    }

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    const activeSubscription = await db
      .select({ total: count() })
      .from(trustedSellerSubscriptions)
      .where(and(eq(trustedSellerSubscriptions.userId, userId), eq(trustedSellerSubscriptions.status, "active"), gte(trustedSellerSubscriptions.expiresAt, new Date())));

    const escrowCounts = await db
      .select({ total: count() })
      .from(escrows)
      .where(or(eq(escrows.buyerId, userId), eq(escrows.sellerId, userId)));

    const openDisputeCounts = await db
      .select({ total: count() })
      .from(disputes)
      .where(and(eq(disputes.initiatorId, userId), or(eq(disputes.status, "open"), eq(disputes.status, "under_review"))));

    const userReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.revieweeId, userId));
    const totalReviews = userReviews.length;
    const averageRating = totalReviews > 0
      ? userReviews.reduce((sum, review) => sum + Number(review.rating), 0) / totalReviews
      : 0;

    let riskScore = 100;
    const flags: string[] = [];

    const unresolvedDisputes = Number(openDisputeCounts[0]?.total ?? 0);
    if (unresolvedDisputes > 0) {
      riskScore -= Math.min(40, unresolvedDisputes * 12);
      flags.push("active_dispute_history");
    }

    if (user.status === "suspended") {
      riskScore = 0;
      flags.push("suspended_user");
    } else if (user.kycStatus === "pending") {
      riskScore -= 10;
      flags.push("kyc_pending");
    } else if (user.kycStatus === "rejected") {
      riskScore -= 25;
      flags.push("kyc_rejected");
    } else if (user.kycStatus === "verified") {
      riskScore += 8;
    }

    if (!user.phoneVerifiedAt) {
      riskScore -= 8;
      flags.push("phone_unverified");
    }

    if (averageRating > 0 && averageRating < 4) {
      riskScore -= Math.ceil((4 - averageRating) * 8);
      flags.push("low_rating");
    } else if (averageRating >= 4.7) {
      riskScore += 6;
    }

    if ((wallet && Number(wallet.balance) > 25000) && unresolvedDisputes > 0) {
      riskScore -= 12;
      flags.push("high_balance_with_disputes");
    }

    const totalEscrows = Number(escrowCounts[0]?.total ?? 0);
    if (totalEscrows >= 25) {
      riskScore += 5;
    } else if (totalEscrows <= 2) {
      riskScore -= 4;
      flags.push("new_account");
    }

    const hasActiveSubscription = Number(activeSubscription[0]?.total ?? 0) > 0;
    if (hasActiveSubscription) {
      riskScore += 8;
    }

    riskScore = clamp(riskScore, 0, 100);
    const trustScore = clamp(100 - riskScore, 0, 100);

    const riskTier: RiskTier =
      riskScore >= 80 ? "low" :
      riskScore >= 60 ? "moderate" :
      riskScore >= 40 ? "high" : "critical";

    return {
      userId,
      riskScore,
      riskTier,
      trustScore,
      flags,
      controls: {
        payoutHoldHours: riskTier === "critical" ? 168 : riskTier === "high" ? 72 : riskTier === "moderate" ? 24 : 2,
        manualReviewRequired: riskTier !== "low",
        maxSingleTransfer: riskTier === "critical" ? "0.00" : riskTier === "high" ? "500.00" : riskTier === "moderate" ? "2500.00" : "10000.00",
      },
      signals: {
        kycStatus: user.kycStatus,
        userStatus: user.status,
        phoneVerified: Boolean(user.phoneVerifiedAt),
        verifiedSeller: Boolean(user.isTrustedSeller),
        activeSubscription: hasActiveSubscription,
        totalEscrows,
        unresolvedDisputes,
        averageRating: Number(averageRating.toFixed(2)),
        walletBalance: wallet?.balance ?? "0.00",
        lastSignedIn: user.lastSignedIn ?? null,
      },
    };
  }

  async listHighRiskUsers(limit = 20) {
    const db = await getDb();
    const candidates = await db.select().from(users).orderBy(desc(users.updatedAt)).limit(limit * 3);
    const profiles = await Promise.all(candidates.map((user) => this.buildTrustProfile(user.id)));
    return profiles.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
  }
}

export const riskEngine = new RiskEngine();
