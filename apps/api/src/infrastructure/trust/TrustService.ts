import { riskEngine } from "../risk/RiskEngine";
import { getDb } from "../../infrastructure/db";
import { disputes, escrowSagaInstances, users } from "../db/schema";
import { desc, eq } from "drizzle-orm";

export class TrustService {
  async getTrustDashboard(userId: number) {
    const profile = await riskEngine.buildTrustProfile(userId);
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const recentDisputes = await db
      .select()
      .from(disputes)
      .where(eq(disputes.initiatorId, userId))
      .orderBy(desc(disputes.updatedAt))
      .limit(10);

    return {
      profile,
      user: user ?? null,
      recentDisputes,
      nextActions: this.computeNextActions(profile.riskTier, user?.kycStatus ?? "none"),
    };
  }

  computeNextActions(riskTier: string, kycStatus: string) {
    const actions: string[] = [];
    if (kycStatus !== "verified") actions.push("complete_kyc");
    if (riskTier === "critical" || riskTier === "high") actions.push("manual_review_required");
    if (riskTier === "moderate") actions.push("add_trust_signals");
    if (riskTier === "low") actions.push("eligible_for_fast_payouts");
    return actions;
  }

  async getOperationsQueue(limit = 25) {
    const db = await getDb();
    const pending = await db.select().from(escrowSagaInstances).orderBy(desc(escrowSagaInstances.updatedAt)).limit(limit);
    return pending;
  }
}

export const trustService = new TrustService();
