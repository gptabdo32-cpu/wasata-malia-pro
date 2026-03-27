import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import Decimal from "decimal.js";
import { DistributedLock } from "../locking";
import { assertPositiveAmount } from "../policy/access";
import { auditLogs, escrows, disputes, platformSettings, transactions, wallets, users } from "../db/schema";
import { safeStringify } from "../utils/safeJson";

function toFixed2(value: string | number | Decimal.Value) {
  const n = new Decimal(value);
  if (!n.isFinite()) throw new Error("Invalid numeric value");
  return n.toFixed(2);
}

function getInsertedId(result: unknown) {
  if (!result || typeof result !== "object") return 0;
  const record = result as Record<string, unknown>;
  const raw = record.insertId ?? record.id;
  const id = typeof raw === "number" ? raw : Number(raw ?? 0);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

async function ensureWalletRow(tx: Awaited<ReturnType<typeof getDb>>, userId: number) {
  const [existing] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing) return existing;
  await tx.insert(wallets).values({ userId, balance: "0.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00" } as any);
  const [created] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!created) throw new Error("Failed to create wallet");
  return created;
}

async function ensureActiveUser(tx: Awaited<ReturnType<typeof getDb>>, userId: number) {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error(`User not found: ${userId}`);
  if (user.status && user.status !== "active") throw new Error(`User ${userId} is not active`);
  return user;
}

async function getEscrowFeePercentage(tx: Awaited<ReturnType<typeof getDb>>) {
  const [settings] = await tx.select().from(platformSettings).limit(1);
  const fee = Number(settings?.escrowFeePercentage ?? 5);
  return Number.isFinite(fee) && fee >= 0 ? fee : 5;
}

async function writeAudit(tx: Awaited<ReturnType<typeof getDb>>, payload: { userId: number; action: string; entityType?: string; entityId?: number; newValue?: unknown; oldValue?: unknown; correlationId?: string }) {
  await tx.insert(auditLogs).values({
    userId: payload.userId,
    action: payload.action,
    entityType: payload.entityType ?? "escrow",
    entityId: String(payload.entityId ?? 0),
    oldValue: payload.oldValue === undefined ? null : safeStringify(payload.oldValue),
    newValue: payload.newValue === undefined ? null : safeStringify(payload.newValue),
    correlationId: payload.correlationId ?? "",
    createdAt: new Date(),
  } as any);
}

export class CreateEscrowUseCase {
  async execute(input: { buyerId: number; sellerId: number; amount: string; description: string; title?: string; sellerWalletAddress?: string }, correlationId = `escrow_${Date.now()}`) {
    if (!Number.isInteger(input.buyerId) || input.buyerId <= 0) throw new Error("buyerId is required");
    if (!Number.isInteger(input.sellerId) || input.sellerId <= 0) throw new Error("sellerId is required");
    if (input.buyerId === input.sellerId) throw new Error("Buyer and seller cannot be the same user");

    const amount = new Decimal(assertPositiveAmount(input.amount));
    const description = String(input.description ?? "").trim();
    return await DistributedLock.withLock(`escrow:create:${input.buyerId}:${input.sellerId}:${amount.toFixed(2)}`, async () => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const [existingTx] = await tx.select().from(transactions).where(eq(transactions.reference, correlationId)).limit(1);
        if (existingTx?.referenceType === "escrow" && Number.isInteger(existingTx.referenceId) && Number(existingTx.referenceId) > 0) {
          return Number(existingTx.referenceId);
        }

        await ensureActiveUser(tx, input.buyerId);
        await ensureActiveUser(tx, input.sellerId);
        const buyerWallet = await ensureWalletRow(tx, input.buyerId);
        await ensureWalletRow(tx, input.sellerId);
        const feePercentage = await getEscrowFeePercentage(tx);
        const commissionAmount = new Decimal(amount.mul(feePercentage).div(100).toFixed(2));
        const lockedAmount = amount.plus(commissionAmount).toDecimalPlaces(2);

        if (new Decimal(buyerWallet.balance ?? 0).lt(lockedAmount)) {
          throw new Error("Insufficient buyer balance to create escrow");
        }

        await tx.update(wallets).set({
          balance: toFixed2(new Decimal(buyerWallet.balance ?? 0).minus(lockedAmount)),
          pendingBalance: toFixed2(new Decimal(buyerWallet.pendingBalance ?? 0).plus(lockedAmount)),
          updatedAt: new Date(),
        } as any).where(eq(wallets.userId, input.buyerId));

        const escrowTitle = String(input.title ?? description ?? "Escrow").trim().slice(0, 255);
        const insertResult = await tx.insert(escrows).values({
          buyerId: input.buyerId,
          sellerId: input.sellerId,
          title: escrowTitle,
          description,
          amount: amount.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          commissionPaidBy: "buyer",
          status: "LOCKED",
          disputeReason: null,
          disputeRaisedBy: null,
          disputeRaisedAt: null,
          completedAt: null,
        } as any);
        const escrowId = getInsertedId(insertResult);
        if (!escrowId) throw new Error("Failed to create escrow");

        await tx.insert(transactions).values({
          userId: input.buyerId,
          type: "payment",
          amount: amount.toFixed(2),
          status: "pending",
          reference: correlationId,
          referenceType: "escrow",
          referenceId: escrowId,
          description: `Escrow lock for ${description}`,
        } as any);

        await writeAudit(tx, {
          userId: input.buyerId,
          action: "escrow_created",
          entityType: "escrow",
          entityId: escrowId,
          newValue: { buyerId: input.buyerId, sellerId: input.sellerId, amount: amount.toFixed(2), commissionAmount: commissionAmount.toFixed(2), sellerWalletAddress: input.sellerWalletAddress ?? null },
          correlationId,
        });

        return escrowId;
      });
    });
  }
}

export class ReleaseEscrowUseCase {
  async execute(escrowId: number, userId: number) {
    if (!Number.isInteger(escrowId) || escrowId <= 0) throw new Error("escrowId is required");
    return await DistributedLock.withLock(`escrow:release:${escrowId}`, async () => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, escrowId)).limit(1);
        if (!escrow) throw new Error("Escrow not found");
        if (escrow.status !== "LOCKED") throw new Error("Escrow is not releasable");
        if (![escrow.buyerId, escrow.sellerId].includes(userId)) throw new Error("Access denied");

        const buyerWallet = await ensureWalletRow(tx, escrow.buyerId);
        const sellerWallet = await ensureWalletRow(tx, escrow.sellerId);
        const amount = new Decimal(escrow.amount);
        const commission = new Decimal(escrow.commissionAmount ?? "0.00");
        const payout = amount.minus(commission).toDecimalPlaces(2);
        const lockedAmount = amount.plus(commission).toDecimalPlaces(2);
        if (new Decimal(buyerWallet.pendingBalance ?? 0).lt(lockedAmount)) {
          throw new Error("Buyer escrow balance is insufficient");
        }

        await tx.update(wallets).set({
          pendingBalance: toFixed2(new Decimal(buyerWallet.pendingBalance ?? 0).minus(lockedAmount)),
          updatedAt: new Date(),
        } as any).where(eq(wallets.userId, escrow.buyerId));

        await tx.update(wallets).set({
          balance: toFixed2(new Decimal(sellerWallet.balance ?? 0).plus(payout)),
          totalEarned: toFixed2(new Decimal(sellerWallet.totalEarned ?? 0).plus(payout)),
          updatedAt: new Date(),
        } as any).where(eq(wallets.userId, escrow.sellerId));

        await tx.update(escrows).set({ status: "RELEASED", completedAt: new Date(), updatedAt: new Date() } as any).where(eq(escrows.id, escrowId));
        await tx.update(transactions).set({ status: "completed" } as any).where(and(eq(transactions.referenceType, "escrow"), eq(transactions.referenceId, escrowId)));

        await writeAudit(tx, {
          userId,
          action: "escrow_released",
          entityType: "escrow",
          entityId: escrowId,
          oldValue: { status: escrow.status },
          newValue: { status: "RELEASED", payout: payout.toFixed(2), commission: commission.toFixed(2) },
        });

        return true;
      });
    });
  }
}

export class OpenDisputeUseCase {
  async execute(escrowId: number, userId: number, reason: string) {
    if (!Number.isInteger(escrowId) || escrowId <= 0) throw new Error("escrowId is required");
    if (typeof reason !== "string" || reason.trim().length < 10) throw new Error("reason is required");
    const normalizedReason = reason.trim();

    return await DistributedLock.withLock(`escrow:dispute:${escrowId}`, async () => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, escrowId)).limit(1);
        if (!escrow) throw new Error("Escrow not found");
        if (![escrow.buyerId, escrow.sellerId].includes(userId)) throw new Error("Access denied");
        if (["RELEASED", "CANCELLED", "REFUNDED"].includes(String(escrow.status))) throw new Error("Closed escrows cannot be disputed");

        const [existingDispute] = await tx.select().from(disputes).where(eq(disputes.escrowId, escrowId)).limit(1);
        if (existingDispute) return existingDispute.id;

        const insertResult = await tx.insert(disputes).values({
          escrowId,
          initiatorId: userId,
          reason: normalizedReason,
          status: "open",
          resolution: null,
          adminId: null,
        } as any);
        const disputeId = getInsertedId(insertResult);
        if (!disputeId) throw new Error("Failed to open dispute");

        await tx.update(escrows).set({ status: "DISPUTED", disputeReason: normalizedReason, disputeRaisedBy: userId, disputeRaisedAt: new Date(), updatedAt: new Date() } as any).where(eq(escrows.id, escrowId));

        await writeAudit(tx, {
          userId,
          action: "dispute_opened",
          entityType: "dispute",
          entityId: disputeId,
          newValue: { escrowId, reason: normalizedReason },
        });

        return disputeId;
      });
    });
  }
}

export class ResolveDisputeUseCase {
  async execute(disputeId: number, userId: number, resolution: string) {
    if (!Number.isInteger(disputeId) || disputeId <= 0) throw new Error("disputeId is required");
    if (!["buyer_refund", "seller_payout", "split"].includes(resolution)) throw new Error("Unsupported resolution");

    return await DistributedLock.withLock(`dispute:resolve:${disputeId}`, async () => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
        if (!dispute) throw new Error("Dispute not found");
        if (dispute.status === "resolved" || dispute.status === "closed") throw new Error("Dispute already resolved");
        const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, dispute.escrowId)).limit(1);
        if (!escrow) throw new Error("Escrow not found");
        await ensureActiveUser(tx, escrow.buyerId);
        await ensureActiveUser(tx, escrow.sellerId);

        const buyerWallet = await ensureWalletRow(tx, escrow.buyerId);
        const sellerWallet = await ensureWalletRow(tx, escrow.sellerId);
        const amount = new Decimal(escrow.amount);
        const commission = new Decimal(escrow.commissionAmount ?? "0.00");
        const payout = amount.minus(commission).toDecimalPlaces(2);
        const lockedAmount = amount.plus(commission).toDecimalPlaces(2);

        if (resolution === "buyer_refund") {
          await tx.update(wallets).set({
            balance: toFixed2(new Decimal(buyerWallet.balance ?? 0).plus(amount).plus(commission)),
            pendingBalance: toFixed2(Decimal.max(new Decimal(buyerWallet.pendingBalance ?? 0).minus(lockedAmount), new Decimal(0))),
            updatedAt: new Date(),
          } as any).where(eq(wallets.userId, escrow.buyerId));
        } else if (resolution === "seller_payout") {
          await tx.update(wallets).set({
            pendingBalance: toFixed2(Decimal.max(new Decimal(buyerWallet.pendingBalance ?? 0).minus(lockedAmount), new Decimal(0))),
            updatedAt: new Date(),
          } as any).where(eq(wallets.userId, escrow.buyerId));
          await tx.update(wallets).set({
            balance: toFixed2(new Decimal(sellerWallet.balance ?? 0).plus(payout)),
            totalEarned: toFixed2(new Decimal(sellerWallet.totalEarned ?? 0).plus(payout)),
            updatedAt: new Date(),
          } as any).where(eq(wallets.userId, escrow.sellerId));
        } else {
          const buyerShare = amount.div(2).toDecimalPlaces(2);
          const sellerShare = amount.minus(buyerShare).minus(commission).toDecimalPlaces(2);
          await tx.update(wallets).set({
            balance: toFixed2(new Decimal(buyerWallet.balance ?? 0).plus(buyerShare)),
            pendingBalance: toFixed2(Decimal.max(new Decimal(buyerWallet.pendingBalance ?? 0).minus(lockedAmount), new Decimal(0))),
            updatedAt: new Date(),
          } as any).where(eq(wallets.userId, escrow.buyerId));
          await tx.update(wallets).set({
            balance: toFixed2(new Decimal(sellerWallet.balance ?? 0).plus(sellerShare)),
            totalEarned: toFixed2(new Decimal(sellerWallet.totalEarned ?? 0).plus(sellerShare)),
            updatedAt: new Date(),
          } as any).where(eq(wallets.userId, escrow.sellerId));
        }

        await tx.update(disputes).set({ status: "resolved", resolution: resolution as any, adminId: userId, updatedAt: new Date() } as any).where(eq(disputes.id, disputeId));
        const nextEscrowStatus = resolution === "buyer_refund" ? "REFUNDED" : "RELEASED";
        await tx.update(escrows).set({ status: nextEscrowStatus, disputeResolution: resolution, disputeResolvedAt: new Date(), updatedAt: new Date() } as any).where(eq(escrows.id, escrow.id));
        await writeAudit(tx, {
          userId,
          action: "dispute_resolved",
          entityType: "dispute",
          entityId: disputeId,
          oldValue: { status: dispute.status, resolution: dispute.resolution },
          newValue: { resolution },
        });

        return true;
      });
    });
  }
}

export class Container {
  static getCreateEscrow() { return new CreateEscrowUseCase(); }
  static getReleaseEscrow() { return new ReleaseEscrowUseCase(); }
  static getOpenDispute() { return new OpenDisputeUseCase(); }
  static getResolveDispute() { return new ResolveDisputeUseCase(); }
  static getEscrowSaga() { return { start: async () => ({ started: true as const }) }; }
  static getPaymentSaga() { return { start: async () => ({ started: true as const }) }; }
}
