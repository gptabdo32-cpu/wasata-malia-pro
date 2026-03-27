import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { escrows, transactions } from "../db/schema";
import { getInsertId } from "../db/helpers";
import { assertPositiveAmount } from "../policy/access";

export type EscrowEntity = {
  id: number;
  buyerId: number;
  sellerId: number;
  amount: string;
  status: string;
  title?: string;
  description?: string | null;
};

export class DrizzleEscrowRepository {
  async create(escrow: Partial<EscrowEntity>) {
    const db = await getDb();
    if (!Number.isInteger(escrow.buyerId) || !Number.isInteger(escrow.sellerId)) {
      throw new Error("buyerId and sellerId are required");
    }
    const amount = assertPositiveAmount(String(escrow.amount ?? "0"));
    const title = String(escrow.title ?? escrow.description ?? "Escrow").trim().slice(0, 255);

    const inserted = await db.insert(escrows).values({
      buyerId: escrow.buyerId,
      sellerId: escrow.sellerId,
      title,
      description: escrow.description ?? null,
      amount: amount.toFixed(2),
      commissionAmount: "0.00",
      commissionPaidBy: "seller",
      status: escrow.status === "LOCKED" || escrow.status === "RELEASED" || escrow.status === "DISPUTED" || escrow.status === "REFUNDED" || escrow.status === "CANCELLED" ? escrow.status : "PENDING",
      disputeReason: null,
      disputeRaisedBy: null,
      disputeRaisedAt: null,
      disputeResolution: null,
      disputeResolvedAt: null,
      completedAt: null,
    } as any);

    const id = getInsertId(inserted);
    if (!id) {
      const [row] = await db.select().from(escrows).where(and(eq(escrows.buyerId, escrow.buyerId), eq(escrows.sellerId, escrow.sellerId))).limit(1);
      if (!row) throw new Error("Failed to create escrow");
      return row;
    }

    const [row] = await db.select().from(escrows).where(eq(escrows.id, id)).limit(1);
    return row ?? { id, buyerId: escrow.buyerId, sellerId: escrow.sellerId, amount: amount.toFixed(2), status: escrow.status ?? "PENDING" };
  }
}

export class EscrowMapper {
  static toDomain(value: unknown) {
    if (!value || typeof value !== "object") return value;
    const row = value as Record<string, unknown>;
    return {
      id: Number(row.id ?? 0),
      buyerId: Number(row.buyerId ?? 0),
      sellerId: Number(row.sellerId ?? 0),
      amount: String(row.amount ?? "0.00"),
      status: String(row.status ?? "PENDING"),
      title: String(row.title ?? "") || undefined,
      description: String(row.description ?? "") || undefined,
    } satisfies EscrowEntity;
  }
}

export class PaymentService {
  async charge(amount: string) {
    const normalized = assertPositiveAmount(amount);
    return {
      success: true,
      chargeId: `pay_${crypto.randomUUID().replace(/-/g, "")}`,
      amount: normalized.toFixed(2),
      currency: "USD",
      status: "succeeded" as const,
      createdAt: new Date(),
    };
  }

  async refund(amount: string) {
    const normalized = assertPositiveAmount(amount);
    return {
      success: true,
      refundId: `ref_${crypto.randomUUID().replace(/-/g, "")}`,
      amount: normalized.toFixed(2),
      currency: "USD",
      status: "succeeded" as const,
      createdAt: new Date(),
    };
  }
}
