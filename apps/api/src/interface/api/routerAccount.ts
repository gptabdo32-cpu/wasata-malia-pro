import { eq, desc } from "drizzle-orm";
import Decimal from "decimal.js";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { getInsertId } from "../../infrastructure/db/helpers";
import { users, reviews, transactions, depositRequests, wallets } from "../../infrastructure/db/schema";
import { protectedProcedure, router } from "../trpc/trpc";
import { ensureUserRow, createUserRow, ensureWallet, userSummary } from "./routerShared.identity";
import { emptyWallet } from "./routerShared.wallet";
import { parseAmount, makeId } from "./routerShared.finance";
import { PLATFORM_POLICY } from "./routerShared.platform";
import { DistributedLock } from "../../infrastructure/locking";


async function ensureWalletTx(tx: any, userId: number) {
  const [existing] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing) return existing;
  await tx.insert(wallets).values({ userId, balance: "0.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00" } as any);
  const [created] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!created) throw new Error("Failed to create wallet");
  return created;
}

export const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const row = await ensureUserRow({ id: ctx.user.id });
    return row ? userSummary(row) : null;
  }),
  logout: protectedProcedure.mutation(async ({ ctx, res }) => {
    res.clearCookie(PLATFORM_POLICY.sessionCookieName, { path: "/" });
    return { success: true, correlationId: ctx.correlationId } as const;
  }),
});

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const row = await ensureUserRow({ id: ctx.user.id });
    return row ? userSummary(row) : null;
  }),
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const row = await ensureUserRow({ id: ctx.user.id });
    const wallet = await ensureWallet(ctx.user.id);
    const reviewRows = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.revieweeId, ctx.user.id));
    const avg = reviewRows.length ? reviewRows.reduce((sum, r) => sum + Number(r.rating), 0) / reviewRows.length : 0;
    return {
      balance: String(wallet?.balance ?? "0.00"),
      totalEarned: String(wallet?.totalEarned ?? "0.00"),
      totalWithdrawn: String(wallet?.totalWithdrawn ?? "0.00"),
      averageRating: Number(avg.toFixed(2)),
      totalReviews: reviewRows.length,
      isTrustedSeller: Boolean(row?.isTrustedSeller),
    };
  }),
  updateProfile: protectedProcedure.input(z.object({
    name: z.string().min(1).max(120).optional(),
    bio: z.string().max(1000).optional(),
    city: z.string().max(100).optional(),
    phone: z.string().max(32).optional(),
    userType: z.enum(["buyer", "seller", "both"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const existing = await createUserRow({ id: ctx.user.id, name: input.name ?? undefined });
    if (!existing) throw new Error("Unable to create or load user profile");

    const nextUserType = input.userType ?? existing.userType ?? "buyer";

    await db.update(users).set({
      name: input.name ?? existing.name,
      bio: input.bio ?? existing.bio,
      city: input.city ?? existing.city,
      phone: input.phone ?? existing.phone,
      userType: nextUserType,
      updatedAt: new Date(),
    } as any).where(eq(users.id, ctx.user.id));
    return { success: true } as const;
  }),
});

export const walletRouter = router({
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ensureWallet(ctx.user.id);
    return wallet ?? emptyWallet(ctx.user.id);
  }),
  getTransactionHistory: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).default({ limit: 20 })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(transactions).where(eq(transactions.userId, ctx.user.id)).orderBy(desc(transactions.createdAt)).limit(input.limit);
    return rows.map((row) => ({
      ...row,
      amount: String(row.amount),
      type: row.type,
      createdAt: row.createdAt,
    }));
  }),
  transfer: protectedProcedure.input(z.object({ recipientEmail: z.string().email(), amount: z.string().min(1), description: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const [recipient] = await db.select().from(users).where(eq(users.email, input.recipientEmail)).limit(1);
    if (!recipient) throw new Error("Recipient not found");
    if (recipient.id === ctx.user.id) throw new Error("Self transfers are not allowed");
    const amount = new Decimal(parseAmount(input.amount));
    const lockKey = [ctx.user.id, recipient.id].sort((a, b) => a - b).join(":");
    return await DistributedLock.withLock(`wallet-transfer:${lockKey}`, async () => {
      return await db.transaction(async (tx) => {
        const senderWallet = await ensureWalletTx(tx, ctx.user.id);
        const recipientWallet = await ensureWalletTx(tx, recipient.id);
        const senderBalance = new Decimal(senderWallet.balance ?? 0);
        if (senderBalance.lt(amount)) throw new Error("Insufficient balance");
        const nextSender = senderBalance.minus(amount).toFixed(2);
        const nextRecipient = new Decimal(recipientWallet.balance ?? 0).plus(amount).toFixed(2);
        await tx.update(wallets).set({ balance: nextSender, updatedAt: new Date() } as any).where(eq(wallets.userId, ctx.user.id));
        await tx.update(wallets).set({ balance: nextRecipient, updatedAt: new Date() } as any).where(eq(wallets.userId, recipient.id));
        const reference = makeId("tx");
        await tx.insert(transactions).values({ userId: ctx.user.id, type: "transfer", amount: amount.toFixed(2), status: "completed", reference, referenceType: "transfer", referenceId: recipient.id, description: input.description ?? `Transfer to ${recipient.email}` } as any);
        await tx.insert(transactions).values({ userId: recipient.id, type: "deposit", amount: amount.toFixed(2), status: "completed", reference, referenceType: "transfer", referenceId: ctx.user.id, description: input.description ?? `Received from ${ctx.user.id}` } as any);
        return { success: true, reference } as const;
      });
    });
  }),
  requestDeposit: protectedProcedure.input(z.object({ amount: z.string().min(1), method: z.string().min(1).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const amount = new Decimal(parseAmount(input.amount));
    const result = await db.insert(depositRequests).values({ userId: ctx.user.id, amount: amount.toFixed(2), convertedAmount: amount.toFixed(2), paymentMethod: input.method ?? "wallet", paymentDetails: null, status: "pending" } as any);
    return { success: true, requestId: getInsertId(result) } as const;
  }),
});

export const walletIdRouter = router({
  sendMoney: protectedProcedure.input(z.object({ receiverPhone: z.string().min(5), amount: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const amount = new Decimal(parseAmount(input.amount));
    const [recipient] = await db.select().from(users).where(eq(users.phone, input.receiverPhone)).limit(1);
    if (!recipient) throw new Error("Receiver not found");
    if (recipient.id === ctx.user.id) throw new Error("Self transfers are not allowed");
    const lockKey = [ctx.user.id, recipient.id].sort((a, b) => a - b).join(":");
    return await DistributedLock.withLock(`wallet-transfer:${lockKey}`, async () => {
      return await db.transaction(async (tx) => {
        const sender = await ensureWalletTx(tx, ctx.user.id);
        const recipientWallet = await ensureWalletTx(tx, recipient.id);
        const senderBalance = new Decimal(sender.balance ?? 0);
        if (senderBalance.lt(amount)) throw new Error("Insufficient balance");
        await tx.update(wallets).set({ balance: senderBalance.minus(amount).toFixed(2), updatedAt: new Date() } as any).where(eq(wallets.userId, ctx.user.id));
        await tx.update(wallets).set({ balance: new Decimal(recipientWallet.balance ?? 0).plus(amount).toFixed(2), updatedAt: new Date() } as any).where(eq(wallets.userId, recipient.id));
        const reference = makeId("p2p");
        await tx.insert(transactions).values({ userId: ctx.user.id, type: "transfer", amount: amount.toFixed(2), status: "completed", reference, referenceType: "wallet_id", referenceId: recipient.id, description: `Transfer to ${recipient.phone}` } as any);
        return { success: true, amount: amount.toFixed(2), reference } as const;
      });
    });
  }),
  payBill: protectedProcedure.input(z.object({ provider: z.string().min(1), billIdentifier: z.string().min(1), amount: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const amount = new Decimal(parseAmount(input.amount));
    const db = await getDb();
    return await DistributedLock.withLock(`wallet-pay:${ctx.user.id}`, async () => {
      return await db.transaction(async (tx) => {
        const wallet = await ensureWalletTx(tx, ctx.user.id);
        const walletBalance = new Decimal(wallet.balance ?? 0);
        if (walletBalance.lt(amount)) throw new Error("Insufficient balance");
        await tx.update(wallets).set({ balance: walletBalance.minus(amount).toFixed(2), updatedAt: new Date() } as any).where(eq(wallets.userId, ctx.user.id));
        const reference = makeId("bill");
        await tx.insert(transactions).values({ userId: ctx.user.id, type: "payment", amount: amount.toFixed(2), status: "completed", reference, referenceType: input.provider, referenceId: 0, description: `Bill ${input.billIdentifier}` } as any);
        return { success: true, provider: input.provider, reference } as const;
      });
    });
  }),
});

export const disputeCollateralRouter = router({
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ensureWallet(ctx.user.id);
    return wallet ?? emptyWallet(ctx.user.id);
  }),
  getActiveCollaterals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db.select().from(transactions).where(eq(transactions.userId, ctx.user.id)).orderBy(desc(transactions.createdAt)).limit(50);
    return rows.filter((row) => row.referenceType === "collateral" || row.referenceType === "escrow").map((row) => ({ id: row.id, amount: String(row.amount), status: row.status, reference: row.reference, description: row.description }));
  }),
  depositFunds: protectedProcedure.input(z.object({ amount: z.string().min(1), escrowId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const amount = new Decimal(parseAmount(input.amount));
    return await DistributedLock.withLock(`wallet-collateral:${ctx.user.id}`, async () => {
      return await db.transaction(async (tx) => {
        const wallet = await ensureWalletTx(tx, ctx.user.id);
        const walletBalance = new Decimal(wallet.balance ?? 0);
        const pendingBalance = new Decimal(wallet.pendingBalance ?? 0);
        if (walletBalance.lt(amount)) throw new Error("Insufficient balance");
        await tx.update(wallets).set({ balance: walletBalance.minus(amount).toFixed(2), pendingBalance: pendingBalance.plus(amount).toFixed(2), updatedAt: new Date() } as any).where(eq(wallets.userId, ctx.user.id));
        const reference = makeId("collateral");
        await tx.insert(transactions).values({ userId: ctx.user.id, type: "payment", amount: amount.toFixed(2), status: "pending", reference, referenceType: "collateral", referenceId: input.escrowId ?? 0, description: `Collateral deposit${input.escrowId ? ` for escrow ${input.escrowId}` : ""}` } as any);
        return { success: true, reference } as const;
      });
    });
  }),
});
