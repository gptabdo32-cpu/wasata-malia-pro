import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../infrastructure/db";
import Decimal from "decimal.js";
import {
  accountBalancesCache,
  ledgerAccounts,
  ledgerEntries,
  ledgerTransactions,
} from "../db/schema_ledger";
import { wallets } from "../db/schema";
import { auditLogs } from "../db/schema_audit";
import { assertPositiveAmount } from "../policy/access";
import { safeStringify } from "../utils/safeJson";

export type LedgerDirection = "credit" | "debit";

export type LedgerMovementInput = {
  userId: number;
  amount: string;
  referenceType: string;
  referenceId: number;
  description: string;
  idempotencyKey: string;
  direction: LedgerDirection;
  escrowContractId?: number | null;
  counterpartyUserId?: number | null;
};

type DbLike = Awaited<ReturnType<typeof getDb>>;

function getInsertId(result: unknown): number {
  if (!result) return 0;
  if (typeof result === "object") {
    const record = result as Record<string, unknown>;
    const raw = record.insertId ?? record.id;
    const id = typeof raw === "number" ? raw : Number(raw ?? 0);
    if (Number.isInteger(id) && id > 0) return id;
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0] as Record<string, unknown> | undefined;
      const alt = first?.insertId ?? first?.id;
      const altId = typeof alt === "number" ? alt : Number(alt ?? 0);
      if (Number.isInteger(altId) && altId > 0) return altId;
    }
  }
  return 0;
}

function toFixed4(value: string | number | Decimal.Value) {
  const n = new Decimal(value);
  return n.isFinite() ? n.toFixed(4) : "0.0000";
}

async function findOrCreateAccount(
  db: DbLike,
  userId: number,
  name: string,
  type: "asset" | "liability" | "equity" | "income" | "expense"
) {
  const existing = await db.select().from(ledgerAccounts).where(and(eq(ledgerAccounts.userId, userId), eq(ledgerAccounts.name, name))).limit(1);
  if (existing.length > 0) return existing[0];

  const result = await db.insert(ledgerAccounts).values({
    userId,
    name,
    type,
  });
  const insertedId = getInsertId(result);
  return {
    id: insertedId,
    userId,
    name,
    type,
  } as typeof ledgerAccounts.$inferSelect;
}

async function updateBalanceCache(db: DbLike, accountId: number, balance: string) {
  const current = await db.select().from(accountBalancesCache).where(eq(accountBalancesCache.accountId, accountId)).limit(1);
  if (current.length > 0) {
    await db.update(accountBalancesCache).set({
      balance,
      updatedAt: new Date(),
    }).where(eq(accountBalancesCache.accountId, accountId));
    return;
  }

  await db.insert(accountBalancesCache).values({
    accountId,
    balance,
    updatedAt: new Date(),
  } as any);
}

export class LedgerService {
  async ensureUserWalletAccount(db: DbLike, userId: number) {
    return findOrCreateAccount(db, userId, "user_wallet", "asset");
  }

  async ensurePlatformSuspenseAccount(db: DbLike) {
    return findOrCreateAccount(db, 0, "platform_suspense", "liability");
  }

  async recordMovement(input: LedgerMovementInput) {
    const db = await getDb();

    if (!Number.isInteger(input.userId) || input.userId <= 0) {
      throw new Error("userId is required");
    }
    if (!input.idempotencyKey?.trim()) {
      throw new Error("idempotencyKey is required");
    }
    if (input.counterpartyUserId !== undefined && input.counterpartyUserId !== null && input.counterpartyUserId === input.userId) {
      throw new Error("Counterparty cannot be the same user");
    }

    return db.transaction(async (tx) => {
      const userAccount = await this.ensureUserWalletAccount(tx as DbLike, input.userId);
      const platformAccount = await this.ensurePlatformSuspenseAccount(tx as DbLike);

      const normalizedAmount = assertPositiveAmount(input.amount, "amount");
      const amount = new Decimal(normalizedAmount);
      const amountText = amount.toFixed(4);
      const debitAccountId = input.direction === "debit" ? userAccount.id : platformAccount.id;
      const creditAccountId = input.direction === "debit" ? platformAccount.id : userAccount.id;

      const [existingTxn] = await tx.select().from(ledgerTransactions).where(eq(ledgerTransactions.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existingTxn) {
        return {
          ledgerTransactionId: existingTxn.id,
          debitAccountId,
          creditAccountId,
          amount: amountText,
        };
      }

      const ledgerTxn = await tx.insert(ledgerTransactions).values({
        description: String(input.description).slice(0, 255),
        referenceType: String(input.referenceType).slice(0, 100),
        referenceId: input.referenceId,
        escrowContractId: input.escrowContractId ?? null,
        isSystemTransaction: 1,
        idempotencyKey: input.idempotencyKey,
      } as any);

      const ledgerTransactionId = getInsertId(ledgerTxn);

      const existingDebit = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, debitAccountId)).orderBy(desc(ledgerEntries.id)).limit(1);
      const existingCredit = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, creditAccountId)).orderBy(desc(ledgerEntries.id)).limit(1);

      const debitBalanceAfter = existingDebit.length > 0
        ? new Decimal(existingDebit[0].balanceAfter ?? 0).minus(amount).toFixed(4)
        : (input.direction === "debit" ? amount.negated().toFixed(4) : "0.0000");
      const creditBalanceAfter = existingCredit.length > 0
        ? new Decimal(existingCredit[0].balanceAfter ?? 0).plus(amount).toFixed(4)
        : (input.direction === "debit" ? "0.0000" : amount.toFixed(4));

      await tx.insert(ledgerEntries).values([
        {
          transactionId: ledgerTransactionId,
          accountId: debitAccountId,
          escrowContractId: input.escrowContractId ?? null,
          debit: amountText,
          credit: "0.0000",
          balanceAfter: debitBalanceAfter,
        } as any,
        {
          transactionId: ledgerTransactionId,
          accountId: creditAccountId,
          escrowContractId: input.escrowContractId ?? null,
          debit: "0.0000",
          credit: amountText,
          balanceAfter: creditBalanceAfter,
        } as any,
      ]);

      await updateBalanceCache(tx as DbLike, userAccount.id, input.direction === "debit" ? debitBalanceAfter : creditBalanceAfter);
      await updateBalanceCache(tx as DbLike, platformAccount.id, input.direction === "debit" ? creditBalanceAfter : debitBalanceAfter);

      await tx.insert(auditLogs).values({
        userId: input.userId,
        action: "ledger_movement_recorded",
        entityType: input.referenceType,
        entityId: String(input.referenceId),
        oldValue: null,
        newValue: safeStringify({
          amount: amountText,
          direction: input.direction,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
        }),
        correlationId: input.idempotencyKey,
        metadata: {
          escrowContractId: input.escrowContractId ?? null,
          counterpartyUserId: input.counterpartyUserId ?? null,
          platformAccountId: platformAccount.id,
        },
        createdAt: new Date(),
      } as any);

      return {
        ledgerTransactionId,
        debitAccountId,
        creditAccountId,
        amount: amountText,
      };
    });
  }

  async reconcileWallet(userId: number) {
    const db = await getDb();
    const userAccount = await this.ensureUserWalletAccount(db, userId);

    const rows = await db
      .select({
        credit: ledgerEntries.credit,
        debit: ledgerEntries.debit,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, userAccount.id));

    const balance = rows.reduce((total, row) => total.plus(row.credit ?? 0).minus(row.debit ?? 0), new Decimal(0));
    await updateBalanceCache(db, userAccount.id, balance.toFixed(4));

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (wallet) {
      await db.update(wallets).set({
        balance: balance.toFixed(2),
        updatedAt: new Date(),
      }).where(eq(wallets.userId, userId));
    }

    return {
      userId,
      accountId: userAccount.id,
      balance: balance.toFixed(4),
      entries: rows.length,
    };
  }

  async getWalletLedgerSummary(userId: number) {
    const db = await getDb();
    const userAccount = await this.ensureUserWalletAccount(db, userId);
    const entries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, userAccount.id)).orderBy(desc(ledgerEntries.id)).limit(20);
    const balance = entries.reduce((total, entry) => total.plus(entry.credit ?? 0).minus(entry.debit ?? 0), new Decimal(0));

    return {
      userId,
      accountId: userAccount.id,
      balance: balance.toFixed(4),
      recentEntries: entries,
    };
  }

  async recordEscrowRelease(input: {
    userId: number;
    escrowId: number;
    amount: string;
    idempotencyKey: string;
    description: string;
  }) {
    return this.recordMovement({
      userId: input.userId,
      amount: input.amount,
      referenceType: "escrow_release",
      referenceId: input.escrowId,
      description: input.description,
      idempotencyKey: input.idempotencyKey,
      direction: "credit",
      escrowContractId: input.escrowId,
    });
  }
}

export const ledgerService = new LedgerService();
