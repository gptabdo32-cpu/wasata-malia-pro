import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (field: any, value: any) => (row: any) => row?.[field?.name ?? field] === value,
  and: (...predicates: Array<(row: any) => boolean>) => (row: any) => predicates.every((predicate) => predicate(row)),
}));

const store = {
  wallets: new Map<number, any>(),
  platformSettings: [{ id: 1, escrowFeePercentage: "5.00" }],
  escrows: [] as any[],
  disputes: [] as any[],
  transactions: [] as any[],
  auditLogs: [] as any[],
  nextIds: { escrow: 1, dispute: 1, transaction: 1 },
};

function resetStore() {
  store.wallets.clear();
  store.platformSettings = [{ id: 1, escrowFeePercentage: "5.00" }];
  store.escrows = [];
  store.disputes = [];
  store.transactions = [];
  store.auditLogs = [];
  store.nextIds = { escrow: 1, dispute: 1, transaction: 1 };
  store.wallets.set(1, { id: 1, userId: 1, balance: "200.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00" });
  store.wallets.set(2, { id: 2, userId: 2, balance: "0.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00" });
}

function makeQueryResult(rows: any[]) {
  return {
    where(predicate: any) {
      const filtered = typeof predicate === "function" ? rows.filter(predicate) : rows;
      return makeQueryResult(filtered);
    },
    limit(n: number) {
      return rows.slice(0, n);
    },
    orderBy() {
      return rows;
    },
    then(resolve: (value: any) => void) {
      resolve(rows);
    },
  };
}

function tableName(table: any) {
  return table?.name ?? table?.tableName ?? table?.[Symbol.for("drizzle:Name")] ?? table?.[Symbol.toStringTag] ?? "";
}

function makeDb() {
  const db: any = {
    select() {
      return {
        from(table: any) {
          const name = tableName(table);
          if (name === "wallets") return makeQueryResult(Array.from(store.wallets.values()));
          if (name === "platformSettings") return makeQueryResult(store.platformSettings);
          if (name === "escrows") return makeQueryResult(store.escrows);
          if (name === "disputes") return makeQueryResult(store.disputes);
          if (name === "transactions") return makeQueryResult(store.transactions);
          if (name === "auditLogs") return makeQueryResult(store.auditLogs);
          return makeQueryResult([]);
        },
      };
    },
    insert(table: any) {
      return {
        values(values: any) {
          const name = tableName(table);
          if (name === "wallets") {
            const row = { id: values.userId, ...values };
            store.wallets.set(values.userId, row);
            return { insertId: values.userId };
          }
          if (name === "escrows") {
            const id = store.nextIds.escrow++;
            store.escrows.push({ id, ...values });
            return { insertId: id };
          }
          if (name === "disputes") {
            const id = store.nextIds.dispute++;
            store.disputes.push({ id, ...values });
            return { insertId: id };
          }
          if (name === "transactions") {
            const id = store.nextIds.transaction++;
            store.transactions.push({ id, ...values });
            return { insertId: id };
          }
          if (name === "auditLogs") {
            store.auditLogs.push({ id: store.auditLogs.length + 1, ...values });
            return { insertId: store.auditLogs.length };
          }
          return { insertId: 1 };
        },
      };
    },
    update(table: any) {
      return {
        set(values: any) {
          return {
            where(predicate: (row: any) => boolean) {
              const name = tableName(table);
              if (name === "wallets") {
                for (const [key, row] of store.wallets.entries()) {
                  if (predicate(row)) store.wallets.set(key, { ...row, ...values });
                }
              }
              if (name === "escrows") {
                store.escrows = store.escrows.map((row) => (predicate(row) ? { ...row, ...values } : row));
              }
              if (name === "disputes") {
                store.disputes = store.disputes.map((row) => (predicate(row) ? { ...row, ...values } : row));
              }
              if (name === "transactions") {
                store.transactions = store.transactions.map((row) => (predicate(row) ? { ...row, ...values } : row));
              }
              return { affectedRows: 1 };
            },
          };
        },
      };
    },
    transaction(fn: any) {
      return fn(db);
    },
  };
  return db;
}

vi.mock("../../apps/api/src/infrastructure/db", () => ({
  getDb: vi.fn(async () => makeDb()),
}));

import { Container } from "../../apps/api/src/infrastructure/di";

describe("escrow use cases", () => {
  beforeEach(() => resetStore());

  it("creates, locks, and releases escrow funds", async () => {
    const escrowId = await Container.getCreateEscrow().execute({ buyerId: 1, sellerId: 2, amount: "100", description: "Logo design" }, "corr-1");
    expect(escrowId).toBe(1);
    expect(store.escrows[0].status).toBe("LOCKED");
    expect(store.wallets.get(1).balance).toBe("95.00");
    expect(store.wallets.get(1).pendingBalance).toBe("105.00");

    const released = await Container.getReleaseEscrow().execute(escrowId, 2);
    expect(released).toBe(true);
    expect(store.escrows[0].status).toBe("RELEASED");
    expect(Number(store.wallets.get(2).balance)).toBeCloseTo(95, 2);
  });

  it("is idempotent when the same correlation id is retried", async () => {
    const first = await Container.getCreateEscrow().execute({ buyerId: 1, sellerId: 2, amount: "100", description: "Logo design" }, "corr-idempotent");
    const second = await Container.getCreateEscrow().execute({ buyerId: 1, sellerId: 2, amount: "100", description: "Logo design" }, "corr-idempotent");
    expect(first).toBe(second);
    expect(store.escrows).toHaveLength(1);
    expect(store.transactions).toHaveLength(1);
  });

  it("deduplicates repeated dispute opens for the same escrow", async () => {
    const escrowId = await Container.getCreateEscrow().execute({ buyerId: 1, sellerId: 2, amount: "100", description: "Web build" }, "corr-dispute");
    const firstDispute = await Container.getOpenDispute().execute(escrowId, 1, "The delivered work does not match the brief");
    const secondDispute = await Container.getOpenDispute().execute(escrowId, 1, "The delivered work does not match the brief");
    expect(firstDispute).toBe(secondDispute);
    expect(store.disputes).toHaveLength(1);
  });

  it("opens and resolves disputes", async () => {
    const escrowId = await Container.getCreateEscrow().execute({ buyerId: 1, sellerId: 2, amount: "100", description: "Web build" }, "corr-2");
    const disputeId = await Container.getOpenDispute().execute(escrowId, 1, "Work delivered does not match the brief");
    expect(disputeId).toBe(1);
    expect(store.escrows[0].status).toBe("DISPUTED");

    const resolved = await Container.getResolveDispute().execute(disputeId, 99, "buyer_refund");
    expect(resolved).toBe(true);
    expect(store.disputes[0].status).toBe("resolved");
    expect(store.escrows[0].status).toBe("REFUNDED");
  });
});
