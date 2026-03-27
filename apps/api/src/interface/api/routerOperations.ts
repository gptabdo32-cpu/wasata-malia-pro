import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { inspectionReports, escrows, escrowMilestones, iotDevices, blockchainLogs, users, transactions, disputes } from "../../infrastructure/db/schema";
import { getInsertId } from "../../infrastructure/db/helpers";
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../trpc/trpc";
import { assertParticipantOrAdmin, assertTrustedUploadUrl } from "../../infrastructure/policy/access";
import { ENV as ConfigEnv } from "../../infrastructure/config/env";
import { constantTimeEquals } from "./routerShared.security";

export const inspectionServiceRouter = router({
  requestInspection: protectedProcedure.input(z.object({ escrowId: z.number().int().positive(), summary: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
    if (!escrow) throw new Error("Escrow not found");
    assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);
    const reportResult = await db.insert(inspectionReports).values({ escrowId: input.escrowId, inspectorId: ctx.user.id, summary: input.summary ?? "Inspection requested", conditionScore: 0, mediaUrls: [], status: "pending", updatedAt: new Date() } as any);
    return { success: true, reportId: getInsertId(reportResult) } as const;
  }),
  submitReport: protectedProcedure.input(z.object({ escrowId: z.number().int().positive(), summary: z.string().min(1), conditionScore: z.number().int().min(0).max(100).default(0), mediaUrls: z.array(z.string()).default([]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
    if (!escrow) throw new Error("Escrow not found");
    assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);
    const trustedMediaUrls = input.mediaUrls.map((url, index) => assertTrustedUploadUrl(url, `mediaUrls[${index}]`));
    const reportResult = await db.insert(inspectionReports).values({ escrowId: input.escrowId, inspectorId: ctx.user.id, summary: input.summary, conditionScore: input.conditionScore, mediaUrls: trustedMediaUrls, status: "completed", updatedAt: new Date() } as any);
    return { success: true, reportId: getInsertId(reportResult) } as const;
  }),
  getReport: protectedProcedure.input(z.object({ escrowId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
    if (!escrow) throw new Error("Escrow not found");
    assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);
    const [report] = await db.select().from(inspectionReports).where(eq(inspectionReports.escrowId, input.escrowId)).orderBy(desc(inspectionReports.createdAt)).limit(1);
    return report ?? null;
  }),
  approveReport: adminProcedure.input(z.object({ reportId: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [report] = await tx.select().from(inspectionReports).where(eq(inspectionReports.id, input.reportId)).limit(1);
      if (!report) throw new Error("Inspection report not found");
      await tx.update(inspectionReports).set({ status: "approved", updatedAt: new Date() } as any).where(eq(inspectionReports.id, input.reportId));
      return { success: true } as const;
    });
  }),
  rejectReport: adminProcedure.input(z.object({ reportId: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [report] = await tx.select().from(inspectionReports).where(eq(inspectionReports.id, input.reportId)).limit(1);
      if (!report) throw new Error("Inspection report not found");
      await tx.update(inspectionReports).set({ status: "rejected", updatedAt: new Date() } as any).where(eq(inspectionReports.id, input.reportId));
      return { success: true } as const;
    });
  }),
});

export const smartEscrowRouter = router({
  getMilestones: protectedProcedure.input(z.object({ escrowId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
    if (escrow) assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);
    const rows = await db.select().from(escrowMilestones).where(eq(escrowMilestones.escrowId, input.escrowId)).orderBy(asc(escrowMilestones.createdAt));
    return rows;
  }),
  getDevices: protectedProcedure.input(z.object({ escrowId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
    if (escrow) assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);
    return await db.select().from(iotDevices).where(eq(iotDevices.escrowId, input.escrowId)).orderBy(desc(iotDevices.updatedAt));
  }),
  getBlockchainLogs: protectedProcedure.input(z.object({ escrowId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
    if (escrow) assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);
    return await db.select().from(blockchainLogs).where(eq(blockchainLogs.escrowId, input.escrowId)).orderBy(desc(blockchainLogs.createdAt));
  }),
});

export const diaasRouter = router({
  getClientStats: publicProcedure.input(z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1) })).query(async ({ input }) => {
    if (!constantTimeEquals(input.clientSecret, ConfigEnv.serverSecret)) {
      throw new Error("Unauthorized client credentials");
    }
    const db = await getDb();
    const [userCount, txCount, escrowCount, disputeCount] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
      db.select({ count: sql<number>`COUNT(*)` }).from(transactions),
      db.select({ count: sql<number>`COUNT(*)` }).from(escrows),
      db.select({ count: sql<number>`COUNT(*)` }).from(disputes),
    ]);
    return {
      clientName: `Client ${input.clientId.slice(0, 6)}`,
      stats: {
        totalRequests: Number(userCount[0]?.count ?? 0),
        approved: Number(txCount[0]?.count ?? 0),
        rejected: Number(disputeCount[0]?.count ?? 0),
        flagged: Number(escrowCount[0]?.count ?? 0),
        pending: Math.max(0, Number(userCount[0]?.count ?? 0) - Number(txCount[0]?.count ?? 0)),
      },
      recentUsage: [],
      apiKeyPrefix: input.clientId.slice(0, 10),
    };
  }),
});
