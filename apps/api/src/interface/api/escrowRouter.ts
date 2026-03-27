import { desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { escrows } from "../../infrastructure/db/schema";
import { protectedProcedure, adminProcedure, router } from "../trpc/trpc";
import { Container } from "../../infrastructure/di";

const createEscrowSchema = z.object({
  sellerId: z.number().int().positive(),
  amount: z.string().min(1),
  description: z.string().min(5).max(5000),
  sellerWalletAddress: z.string().min(1).optional(),
});

const createTransactionSchema = z.object({
  sellerId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  amount: z.string().min(1),
  dealType: z.enum(["physical", "digital_account", "service"]),
  specifications: z.record(z.string(), z.unknown()).optional(),
  paymentMethod: z.string().min(1).optional(),
  description: z.string().max(5000).optional(),
  sellerWalletAddress: z.string().min(1).optional(),
});

const openDisputeSchema = z.object({ escrowId: z.number().int().positive(), reason: z.string().min(10).max(2000) });
const resolveDisputeSchema = z.object({ disputeId: z.number().int().positive(), resolution: z.enum(["buyer_refund", "seller_payout"]) });
const listMyTransactionsSchema = z.object({ limit: z.number().int().min(1).max(100).default(10) }).default({ limit: 10 });

function normalizeEscrowStatus(status: unknown) {
  const value = String(status ?? "PENDING").toUpperCase();
  switch (value) {
    case "PENDING":
      return "draft";
    case "LOCKED":
      return "active";
    case "RELEASED":
      return "completed";
    case "DISPUTED":
      return "disputed";
    case "REFUNDED":
      return "refunded";
    case "CANCELLED":
      return "cancelled";
    default:
      return value.toLowerCase();
  }
}

function buildEscrowDescription(input: { title: string; dealType?: string; paymentMethod?: string; specifications?: Record<string, unknown>; description?: string }) {
  const details: string[] = [];
  if (input.dealType) details.push(`type:${input.dealType}`);
  if (input.paymentMethod) details.push(`payment:${input.paymentMethod}`);
  if (input.specifications && Object.keys(input.specifications).length > 0) {
    try {
      details.push(`specs:${JSON.stringify(input.specifications)}`);
    } catch {
      details.push("specs:[unserializable]");
    }
  }
  const tail = details.length > 0 ? ` | ${details.join(" | ")}` : "";
  const base = String(input.description ?? input.title).trim();
  return `${base}${tail}`.slice(0, 5000);
}

export const escrowRouter = router({
  create: protectedProcedure.input(createEscrowSchema).mutation(async ({ ctx, input }) => {
    const useCase = Container.getCreateEscrow();
    const escrowId = await useCase.execute(
      {
        buyerId: ctx.user.id,
        sellerId: input.sellerId,
        amount: input.amount,
        title: input.description,
        description: input.description,
        sellerWalletAddress: input.sellerWalletAddress,
      },
      ctx.correlationId,
    );
    return { success: true, escrowId };
  }),
  createTransaction: protectedProcedure.input(createTransactionSchema).mutation(async ({ ctx, input }) => {
    if (input.sellerId === ctx.user.id) {
      throw new Error("Self-escrow is not allowed");
    }

    const sanitizedTitle = String(input.title ?? "").trim();
    const sanitizedDescription = buildEscrowDescription({
      title: sanitizedTitle,
      dealType: input.dealType,
      paymentMethod: input.paymentMethod,
      specifications: input.specifications,
      description: input.description ? String(input.description).trim() : undefined,
    });

    const useCase = Container.getCreateEscrow();
    const escrowId = await useCase.execute(
      {
        buyerId: ctx.user.id,
        sellerId: input.sellerId,
        amount: input.amount,
        title: sanitizedTitle,
        description: sanitizedDescription,
        sellerWalletAddress: input.sellerWalletAddress,
      },
      ctx.correlationId,
    );
    return { success: true, escrowId, title: sanitizedTitle, dealType: input.dealType } as const;
  }),
  listMyTransactions: protectedProcedure.input(listMyTransactionsSchema).query(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(escrows)
      .where(or(eq(escrows.buyerId, ctx.user.id), eq(escrows.sellerId, ctx.user.id)))
      .orderBy(desc(escrows.createdAt))
      .limit(input.limit);

    return rows.map((row) => {
      const role = row.buyerId === ctx.user.id ? "buyer" : "seller";
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        amount: String(row.amount),
        commissionAmount: String(row.commissionAmount ?? "0.00"),
        status: normalizeEscrowStatus(row.status),
        role,
        buyerId: row.buyerId,
        sellerId: row.sellerId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt ?? null,
        disputeReason: row.disputeReason ?? null,
        isDisputed: String(row.status).toUpperCase() === "DISPUTED",
      };
    });
  }),
  release: protectedProcedure.input(z.object({ escrowId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const success = await Container.getReleaseEscrow().execute(input.escrowId, ctx.user.id);
    return { success };
  }),
  openDispute: protectedProcedure.input(openDisputeSchema).mutation(async ({ ctx, input }) => {
    const disputeId = await Container.getOpenDispute().execute(input.escrowId, ctx.user.id, input.reason);
    return { success: true, disputeId };
  }),
  resolveDispute: adminProcedure.input(resolveDisputeSchema).mutation(async ({ ctx, input }) => {
    const success = await Container.getResolveDispute().execute(input.disputeId, ctx.user.id, input.resolution);
    return { success };
  }),
});
