import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { transactions } from "../db/schema";
import { assertPositiveAmount } from "../policy/access";

export type PaymentChargeInput = {
  amount: string;
  currency?: string;
  source?: string;
  description?: string;
  referenceType?: string;
  referenceId?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type PaymentChargeReceipt = {
  id: string;
  provider: "stripe";
  amount: string;
  currency: string;
  status: "succeeded" | "failed";
  createdAt: Date;
  metadata: Record<string, unknown>;
};

export type SavedPaymentRecord = {
  userId: number;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  referenceType?: string;
  referenceId?: number;
  description?: string;
  idempotencyKey?: string;
};

export class DrizzlePaymentRepository {
  async save(payment: SavedPaymentRecord) {
    const db = await getDb();
    const amount = assertPositiveAmount(payment.amount);
    const reference = payment.idempotencyKey ?? crypto.randomUUID();

    const [existing] = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
    if (existing) return existing;

    await db.insert(transactions).values({
      userId: payment.userId,
      type: payment.status === "succeeded" ? "payment" : "refund",
      amount: amount.toFixed(2),
      status: payment.status === "succeeded" ? "completed" : "failed",
      reference,
      referenceType: payment.referenceType ?? payment.provider,
      referenceId: payment.referenceId ?? 0,
      description: payment.description ?? `${payment.provider} payment`,
    } as any);

    const [saved] = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
    return saved ?? null;
  }
}

export class StripePaymentProvider {
  async charge(input: PaymentChargeInput) {
    const amount = assertPositiveAmount(input.amount);
    const currency = (input.currency ?? "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Invalid currency");
    }

    return {
      id: `pi_${crypto.randomUUID().replace(/-/g, "")}`,
      provider: "stripe" as const,
      amount: amount.toFixed(2),
      currency,
      status: "succeeded" as const,
      createdAt: new Date(),
      metadata: {
        ...input.metadata,
        source: input.source ?? null,
        description: input.description ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    } satisfies PaymentChargeReceipt;
  }

  async refund(input: PaymentChargeInput) {
    const amount = assertPositiveAmount(input.amount);
    const currency = (input.currency ?? "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Invalid currency");
    }

    return {
      id: `re_${crypto.randomUUID().replace(/-/g, "")}`,
      provider: "stripe" as const,
      amount: amount.toFixed(2),
      currency,
      status: "succeeded" as const,
      createdAt: new Date(),
      metadata: {
        ...input.metadata,
        source: input.source ?? null,
        description: input.description ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    } satisfies PaymentChargeReceipt;
  }
}

export class WalletMapper {
  static toDomain(value: unknown) {
    if (!value || typeof value !== "object") return value;
    const row = value as Record<string, unknown>;
    return {
      id: Number(row.id ?? 0),
      userId: Number(row.userId ?? 0),
      balance: String(row.balance ?? "0.00"),
      pendingBalance: String(row.pendingBalance ?? "0.00"),
      totalEarned: String(row.totalEarned ?? "0.00"),
      totalWithdrawn: String(row.totalWithdrawn ?? "0.00"),
      updatedAt: row.updatedAt ?? null,
    };
  }
}
