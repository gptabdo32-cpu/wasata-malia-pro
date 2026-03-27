import { beforeEach, describe, expect, it, vi } from "vitest";

const shared = vi.hoisted(() => {
  type AnyRow = Record<string, any>;
  type TableStore = Record<string, AnyRow[]>;

  const tableNames = [
    "users",
    "wallets",
    "transactions",
    "depositRequests",
    "escrows",
    "disputes",
    "auditLogs",
    "adminLogs",
    "notifications",
    "platformSettings",
    "reviews",
    "trustedSellerSubscriptions",
    "digitalProducts",
    "physicalProducts",
    "services",
    "vehicles",
    "timedLinks",
    "inspectionReports",
    "escrowMilestones",
    "blockchainLogs",
    "iotDevices",
    "chatConversations",
    "chatMessages",
  ] as const;

  const state: {
    tables: TableStore;
    counters: Record<string, number>;
  } = {
    tables: Object.fromEntries(tableNames.map((name) => [name, []])) as TableStore,
    counters: {
      users: 100,
      wallets: 100,
      transactions: 1000,
      depositRequests: 1000,
      escrows: 2000,
      disputes: 3000,
      auditLogs: 4000,
      adminLogs: 5000,
      notifications: 6000,
      platformSettings: 1,
      reviews: 7000,
      trustedSellerSubscriptions: 8000,
      digitalProducts: 9000,
      physicalProducts: 9100,
      services: 9200,
      vehicles: 9300,
      timedLinks: 9400,
      inspectionReports: 9500,
      escrowMilestones: 9600,
      blockchainLogs: 9700,
      iotDevices: 9800,
      chatConversations: 9900,
      chatMessages: 10000,
    },
  };

  function clone<T>(value: T): T {
    return structuredClone(value);
  }

  function tableName(table: any): string {
    return String(
      table?.name ??
        table?.tableName ??
        table?.[Symbol.for("drizzle:Name")] ??
        table?.[Symbol.toStringTag] ??
        "",
    );
  }

  function getFieldName(field: any): string {
    return String(field?.name ?? field?.columnName ?? field?.keyAsName ?? field?.key ?? field ?? "");
  }

  function getComparable(value: any): number | string {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && typeof value === "string" && /\d{4}-\d{2}-\d{2}/.test(value)) return parsed;
    const num = Number(value);
    if (!Number.isNaN(num) && value !== "") return num;
    return String(value ?? "");
  }

  function resolveValue(row: AnyRow, field: any) {
    if (field && typeof field === "object" && "__kind" in field && field.__kind === "count") return row.__count ?? 0;
    if (field && typeof field === "object" && field.__sql?.toLowerCase?.().includes("count(*)")) return row.__count ?? 0;
    const key = getFieldName(field);
    return row[key];
  }

  function buildPredicate(name: string, value: any) {
    return (row: AnyRow) => getComparable(resolveValue(row, { name })) === getComparable(value);
  }

  function predicateFrom(field: any, value: any) {
    return (row: AnyRow) => getComparable(resolveValue(row, field)) === getComparable(value);
  }

  function combinePredicates(type: "and" | "or", predicates: Array<(row: AnyRow) => boolean>) {
    return (row: AnyRow) => type === "and"
      ? predicates.every((predicate) => predicate(row))
      : predicates.some((predicate) => predicate(row));
  }

  function getRows(name: string): AnyRow[] {
    if (!state.tables[name]) state.tables[name] = [];
    return state.tables[name];
  }

  function nextId(name: string) {
    state.counters[name] = (state.counters[name] ?? 1) + 1;
    return state.counters[name] - 1;
  }

  function replaceOrInsert(name: string, keyName: string, row: AnyRow) {
    const rows = getRows(name);
    const keyValue = row[keyName];
    const index = rows.findIndex((existing) => existing[keyName] === keyValue);
    if (index >= 0) {
      rows[index] = row;
    } else {
      rows.push(row);
    }
    return row;
  }

  function projectRows(rows: AnyRow[], projection: Record<string, any> | null | undefined) {
    if (!projection) return rows.map((row) => clone(row));

    return rows.map((row) => {
      const projected: AnyRow = {};
      for (const [alias, field] of Object.entries(projection)) {
        if (field && typeof field === "object" && field.__kind === "count") {
          projected[alias] = rows.length;
          continue;
        }
        if (field && typeof field === "object" && typeof field.__sql === "string" && field.__sql.toLowerCase().includes("count(*)")) {
          projected[alias] = rows.length;
          continue;
        }
        projected[alias] = resolveValue(row, field);
      }
      return projected;
    });
  }

  function sortRows(rows: AnyRow[], orders: any[]) {
    if (orders.length === 0) return rows;
    const spec = orders[0];
    const direction = spec?.__order === "desc" ? -1 : 1;
    const field = spec?.field ?? spec;
    return [...rows].sort((a, b) => {
      const av = getComparable(resolveValue(a, field));
      const bv = getComparable(resolveValue(b, field));
      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
      return 0;
    });
  }

  function query(rows: AnyRow[], projection: Record<string, any> | null | undefined) {
    const filters: Array<(row: AnyRow) => boolean> = [];
    const orders: any[] = [];
    let limitCount: number | undefined;

    const api: any = {
      where(predicate: any) {
        if (typeof predicate === "function") filters.push(predicate);
        return api;
      },
      orderBy(...specs: any[]) {
        orders.push(...specs);
        return api;
      },
      limit(n: number) {
        limitCount = n;
        return api.finalize();
      },
      finalize() {
        let result = rows.filter((row) => filters.every((predicate) => predicate(row)));
        result = sortRows(result, orders);
        if (typeof limitCount === "number") result = result.slice(0, limitCount);
        return projectRows(result, projection);
      },
      then(resolve: any, reject: any) {
        try {
          return Promise.resolve(api.finalize()).then(resolve, reject);
        } catch (error) {
          return Promise.reject(error).then(resolve, reject);
        }
      },
    };
    return api;
  }

  function seedBaseState() {
    for (const name of tableNames) state.tables[name] = [];
    state.counters.users = 100;
    state.counters.wallets = 100;
    state.counters.transactions = 1000;
    state.counters.depositRequests = 1000;
    state.counters.escrows = 2000;
    state.counters.disputes = 3000;
    state.counters.auditLogs = 4000;
    state.counters.adminLogs = 5000;
    state.counters.notifications = 6000;
    state.counters.platformSettings = 1;
    state.counters.reviews = 7000;
    state.counters.trustedSellerSubscriptions = 8000;
    state.counters.digitalProducts = 9000;
    state.counters.physicalProducts = 9100;
    state.counters.services = 9200;
    state.counters.vehicles = 9300;
    state.counters.timedLinks = 9400;
    state.counters.inspectionReports = 9500;
    state.counters.escrowMilestones = 9600;
    state.counters.blockchainLogs = 9700;
    state.counters.iotDevices = 9800;
    state.counters.chatConversations = 9900;
    state.counters.chatMessages = 10000;

    const now = new Date();
    const older = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

    state.tables.users.push(
      {
        id: 1,
        openId: "open_1",
        name: "Buyer One",
        email: "buyer@example.com",
        phone: "+218000000001",
        city: "Tripoli",
        bio: "Buyer profile",
        role: "user",
        userType: "buyer",
        status: "active",
        kycStatus: "none",
        phoneVerifiedAt: null,
        identityVerifiedAt: null,
        identityDocumentUrl: null,
        isTrustedSeller: false,
        createdAt: older,
        updatedAt: older,
        lastSignedIn: older,
      },
      {
        id: 2,
        openId: "open_2",
        name: "Seller Two",
        email: "seller@example.com",
        phone: "+218000000002",
        city: "Misrata",
        bio: "Seller profile",
        role: "user",
        userType: "seller",
        status: "active",
        kycStatus: "none",
        phoneVerifiedAt: null,
        identityVerifiedAt: null,
        identityDocumentUrl: "/uploads/id-card.png",
        isTrustedSeller: true,
        createdAt: older,
        updatedAt: older,
        lastSignedIn: older,
      },
      {
        id: 99,
        openId: "open_99",
        name: "Platform Admin",
        email: "admin@example.com",
        phone: "+218000000099",
        city: "Tripoli",
        bio: "Admin profile",
        role: "admin",
        userType: "both",
        status: "active",
        kycStatus: "verified",
        phoneVerifiedAt: now,
        identityVerifiedAt: now,
        identityDocumentUrl: "/uploads/admin-id.png",
        isTrustedSeller: false,
        createdAt: older,
        updatedAt: older,
        lastSignedIn: older,
      },
    );

    state.tables.wallets.push(
      { id: 1, userId: 1, balance: "1000.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00", createdAt: older, updatedAt: older },
      { id: 2, userId: 2, balance: "100.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00", createdAt: older, updatedAt: older },
      { id: 99, userId: 99, balance: "0.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00", createdAt: older, updatedAt: older },
    );

    state.tables.platformSettings.push({
      id: 1,
      siteName: "Wathiqly",
      maintenanceMode: false,
      escrowFeePercentage: "5.00",
      minWithdrawalAmount: "10.00",
      createdAt: older,
      updatedAt: older,
    });

    state.tables.reviews.push(
      { id: 1, reviewerId: 1, revieweeId: 2, rating: 5, comment: "Excellent", createdAt: older, updatedAt: older },
      { id: 2, reviewerId: 99, revieweeId: 2, rating: 4, comment: "Good", createdAt: older, updatedAt: older },
    );

    state.tables.trustedSellerSubscriptions.push({
      id: 1,
      userId: 2,
      status: "active",
      expiresAt: future,
      createdAt: older,
      updatedAt: older,
    });

    state.tables.escrows.push({
      id: 1,
      buyerId: 1,
      sellerId: 2,
      title: "Seeded escrow",
      description: "Seeded escrow for trust and inspection flows",
      amount: "50.00",
      commissionAmount: "2.50",
      commissionPaidBy: "buyer",
      status: "LOCKED",
      disputeReason: null,
      disputeRaisedBy: null,
      disputeRaisedAt: null,
      disputeResolution: null,
      disputeResolvedAt: null,
      completedAt: null,
      createdAt: older,
      updatedAt: older,
    });

    state.tables.digitalProducts.push({
      id: 1,
      userId: 2,
      title: "Digital Toolkit",
      category: "software",
      description: "Downloadable toolkit",
      price: "25.00",
      isActive: true,
      createdAt: older,
      updatedAt: older,
    });
    state.tables.physicalProducts.push({
      id: 1,
      userId: 2,
      title: "Camera Lens",
      category: "equipment",
      city: "Misrata",
      description: "Lens for photography",
      price: "150.00",
      isActive: true,
      createdAt: older,
      updatedAt: older,
    });
    state.tables.services.push({
      id: 1,
      userId: 2,
      title: "Web Design Service",
      category: "design",
      city: "Tripoli",
      description: "Professional design service",
      price: "300.00",
      isActive: true,
      createdAt: older,
      updatedAt: older,
    });
    state.tables.vehicles.push({
      id: 1,
      userId: 2,
      title: "Sedan Listing",
      category: "car",
      city: "Tripoli",
      description: "Vehicle listing",
      price: "5000.00",
      isActive: true,
      createdAt: older,
      updatedAt: older,
    });

    state.tables.escrowMilestones.push(
      { id: 1, escrowId: 1, title: "Planning", status: "done", createdAt: older, updatedAt: older },
      { id: 2, escrowId: 1, title: "Delivery", status: "pending", createdAt: now, updatedAt: now },
    );
    state.tables.blockchainLogs.push(
      { id: 1, escrowId: 1, action: "escrow_created", txHash: "0xaaa", createdAt: older, updatedAt: older },
      { id: 2, escrowId: 1, action: "escrow_updated", txHash: "0xbbb", createdAt: now, updatedAt: now },
    );
    state.tables.iotDevices.push({
      id: 1,
      escrowId: 1,
      deviceId: "iot-1",
      status: "active",
      updatedAt: now,
      createdAt: older,
    });
    state.tables.chatConversations.push({
      id: 1,
      buyerId: 1,
      sellerId: 2,
      mediatorId: null,
      lastMessage: "Hello",
      hasMediator: 0,
      isFrozen: 0,
      frozenReason: null,
      createdAt: older,
      updatedAt: now,
    });
    state.tables.chatMessages.push({
      id: 1,
      conversationId: 1,
      senderId: 1,
      messageType: "text",
      content: "Hello from buyer",
      createdAt: older,
      updatedAt: older,
    });
  }

  function snapshotState() {
    return clone({ tables: state.tables, counters: state.counters });
  }

  function restoreState(snapshot: { tables: TableStore; counters: Record<string, number> }) {
    state.tables = clone(snapshot.tables);
    state.counters = clone(snapshot.counters);
  }

  function createDb() {
    const db: any = {
      select(projection?: Record<string, any>) {
        return {
          from(table: any) {
            const name = tableName(table);
            const rows = getRows(name);
            return query(rows, projection ?? null);
          },
        };
      },
      insert(table: any) {
        return {
          values(values: AnyRow) {
            const name = tableName(table);
            const now = new Date();
            const row = clone(values);
            if (name === "users") {
              row.id = row.id ?? nextId("users");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              replaceOrInsert(name, "id", row);
              return { insertId: row.id };
            }
            if (name === "wallets") {
              row.id = row.id ?? row.userId ?? nextId("wallets");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              replaceOrInsert(name, "userId", row);
              return { insertId: row.id };
            }
            if (name === "platformSettings") {
              row.id = row.id ?? 1;
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              replaceOrInsert(name, "id", row);
              return { insertId: row.id };
            }
            if (name === "timedLinks") {
              row.id = row.id ?? nextId("timedLinks");
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "notifications") {
              row.id = row.id ?? nextId("notifications");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "depositRequests") {
              row.id = row.id ?? nextId("depositRequests");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "transactions") {
              row.id = row.id ?? nextId("transactions");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "escrows") {
              row.id = row.id ?? nextId("escrows");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "disputes") {
              row.id = row.id ?? nextId("disputes");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "auditLogs") {
              row.id = row.id ?? nextId("auditLogs");
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "adminLogs") {
              row.id = row.id ?? nextId("adminLogs");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "reviews") {
              row.id = row.id ?? nextId("reviews");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "trustedSellerSubscriptions") {
              row.id = row.id ?? nextId("trustedSellerSubscriptions");
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "inspectionReports" || name === "escrowMilestones" || name === "blockchainLogs" || name === "iotDevices" || name === "chatConversations" || name === "chatMessages") {
              row.id = row.id ?? nextId(name);
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            if (name === "digitalProducts" || name === "physicalProducts" || name === "services" || name === "vehicles") {
              row.id = row.id ?? nextId(name);
              row.createdAt = row.createdAt ?? now;
              row.updatedAt = row.updatedAt ?? now;
              getRows(name).push(row);
              return { insertId: row.id };
            }
            getRows(name).push(row);
            return { insertId: row.id ?? 1 };
          },
        };
      },
      update(table: any) {
        return {
          set(values: AnyRow) {
            return {
              where(predicate: (row: AnyRow) => boolean) {
                const name = tableName(table);
                const rows = getRows(name);
                for (let index = 0; index < rows.length; index += 1) {
                  if (predicate(rows[index])) {
                    rows[index] = { ...rows[index], ...clone(values) };
                  }
                }
                return { affectedRows: 1 };
              },
            };
          },
        };
      },
      transaction(fn: (tx: any) => Promise<any>) {
        const snapshot = snapshotState();
        const tx = db;
        return Promise.resolve(fn(tx)).catch((error) => {
          restoreState(snapshot);
          throw error;
        });
      },
      execute(_query: any) {
        return Promise.resolve({ rows: [] });
      },
      snapshot: () => snapshotState(),
      restore: (snapshot: { tables: TableStore; counters: Record<string, number> }) => restoreState(snapshot),
    };
    return db;
  }

  const drizzleMock = {
    eq: (field: any, value: any) => predicateFrom(field, value),
    and: (...predicates: Array<(row: AnyRow) => boolean>) => combinePredicates("and", predicates),
    or: (...predicates: Array<(row: AnyRow) => boolean>) => combinePredicates("or", predicates),
    gte: (field: any, value: any) => (row: AnyRow) => getComparable(resolveValue(row, field)) >= getComparable(value),
    asc: (field: any) => ({ __order: "asc", field }),
    desc: (field: any) => ({ __order: "desc", field }),
    count: () => ({ __kind: "count" }),
    sql: (strings: TemplateStringsArray, ...values: any[]) => ({ __sql: String.raw({ raw: strings } as any, ...values) }),
    relations: () => ({}),
  };

  const db = createDb();
  seedBaseState();

  return { state, db, resetStore: seedBaseState, drizzleMock };
});

vi.mock("drizzle-orm", () => shared.drizzleMock);
vi.mock("../../apps/api/src/infrastructure/db", () => ({
  getDb: vi.fn(async () => shared.db),
  closeDb: vi.fn(async () => undefined),
}));
vi.mock("../../apps/api/src/infrastructure/locking", () => ({
  DistributedLock: {
    withLock: async (_resource: string, fn: () => Promise<any> | any) => await fn(),
  },
  clearLockRegistryForTests: vi.fn(),
}));

import { clearOtpChallengesForTests, createOtpChallenge } from "../../apps/api/src/infrastructure/auth/otp";
import { ENV } from "../../apps/api/src/infrastructure/config/env";
import { appRouter } from "../../apps/api/src/interface/api/routers";

function makeCaller(user: { id: number; role: "user" | "admin" } | null, headers: Record<string, string> = {}) {
  const req = { headers: { "user-agent": "vitest-platform-suite", ...headers } } as any;
  const clearCookie = vi.fn();
  const res = { clearCookie } as any;
  return {
    caller: appRouter.createCaller({
      correlationId: `cid-${user?.id ?? "public"}`,
      req,
      res,
      user,
      db: shared.db,
      schema: {} as any,
      storage: {} as any,
      encryption: {} as any,
    }),
    res,
  };
}

function getRow<T extends Record<string, any>>(table: keyof typeof shared.state.tables, predicate: (row: T) => boolean) {
  return shared.state.tables[table as string].find(predicate) as T | undefined;
}

function getRows<T extends Record<string, any>>(table: keyof typeof shared.state.tables, predicate: (row: T) => boolean = () => true) {
  return shared.state.tables[table as string].filter(predicate) as T[];
}

beforeEach(() => {
  shared.resetStore();
  clearOtpChallengesForTests();
});

describe("platform deep flows", () => {
  it("covers wallet, collateral, escrow creation, listing, and release in one money flow", async () => {
    const { caller: buyer } = makeCaller({ id: 1, role: "user" });
    const { caller: seller } = makeCaller({ id: 2, role: "user" });

    const balance = await buyer.wallet.getBalance();
    expect(balance.balance).toBe("1000.00");

    const depositRequest = await buyer.wallet.requestDeposit({ amount: "50", method: "bank" });
    expect(depositRequest.success).toBe(true);
    expect(depositRequest.requestId).toBeGreaterThan(0);
    expect(shared.state.tables.depositRequests).toHaveLength(1);

    const collateral = await buyer.disputeCollateral.depositFunds({ amount: "100" });
    expect(collateral.success).toBe(true);
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.balance).toBe("900.00");
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.pendingBalance).toBe("100.00");

    const transfer = await buyer.wallet.transfer({ recipientEmail: "seller@example.com", amount: "25", description: "Initial milestone" });
    expect(transfer.success).toBe(true);
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.balance).toBe("875.00");
    expect(getRow<any>("wallets", (row) => row.userId === 2)?.balance).toBe("125.00");

    const p2p = await buyer.walletId.sendMoney({ receiverPhone: "+218000000002", amount: "10" });
    expect(p2p.success).toBe(true);
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.balance).toBe("865.00");
    expect(getRow<any>("wallets", (row) => row.userId === 2)?.balance).toBe("135.00");

    const bill = await buyer.walletId.payBill({ provider: "electricity", billIdentifier: "B-001", amount: "5" });
    expect(bill.success).toBe(true);
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.balance).toBe("860.00");

    const escrowCreated = await buyer.escrow.createTransaction({
      sellerId: 2,
      title: "Website build",
      amount: "200",
      dealType: "service",
      paymentMethod: "wallet",
      description: "Website build for the platform",
    });
    expect(escrowCreated.success).toBe(true);
    expect(escrowCreated.escrowId).toBeGreaterThan(0);

    const escrow = getRow<any>("escrows", (row) => row.id === escrowCreated.escrowId);
    expect(escrow?.status).toBe("LOCKED");
    expect(escrow?.commissionAmount).toBe("10.00");
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.balance).toBe("650.00");
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.pendingBalance).toBe("310.00");

    const listing = await buyer.escrow.listMyTransactions({ limit: 10 });
    expect(listing).toHaveLength(1);
    expect(listing[0]?.status).toBe("active");
    expect(listing[0]?.role).toBe("buyer");

    const history = await buyer.wallet.getTransactionHistory({ limit: 10 });
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[0]?.referenceType).toBeDefined();

    const sellerStats = await seller.user.getStats();
    expect(sellerStats.balance).toBe("135.00");
    expect(sellerStats.totalReviews).toBe(2);

    const released = await seller.escrow.release({ escrowId: escrowCreated.escrowId });
    expect(released.success).toBe(true);
    expect(getRow<any>("escrows", (row) => row.id === escrowCreated.escrowId)?.status).toBe("RELEASED");
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.pendingBalance).toBe("100.00");
    expect(getRow<any>("wallets", (row) => row.userId === 2)?.balance).toBe("325.00");

    const collateralItems = await buyer.disputeCollateral.getActiveCollaterals();
    expect(collateralItems.some((item) => typeof item.reference === "string")).toBe(true);

    const systemHealth = await buyer.system.health();
    expect(systemHealth.ok).toBe(true);
  });

  it("covers escrow disputes, admin resolutions, and transaction controls end to end", async () => {
    const { caller: buyer, res: buyerRes } = makeCaller({ id: 1, role: "user" });
    const { caller: seller } = makeCaller({ id: 2, role: "user" });
    const { caller: admin } = makeCaller({ id: 99, role: "admin" }, { "user-agent": "admin-agent" });

    const escrowRefund = await buyer.escrow.create({ sellerId: 2, amount: "100", description: "Logo design work" });
    const disputeRefund = await buyer.escrow.openDispute({ escrowId: escrowRefund.escrowId, reason: "The final asset does not match the approved brief." });
    expect(disputeRefund.success).toBe(true);
    expect(getRow<any>("escrows", (row) => row.id === escrowRefund.escrowId)?.status).toBe("DISPUTED");

    const resolvedRefund = await admin.escrow.resolveDispute({ disputeId: disputeRefund.disputeId, resolution: "buyer_refund" });
    expect(resolvedRefund.success).toBe(true);
    expect(getRow<any>("disputes", (row) => row.id === disputeRefund.disputeId)?.status).toBe("resolved");
    expect(getRow<any>("escrows", (row) => row.id === escrowRefund.escrowId)?.status).toBe("REFUNDED");
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.balance).toBe("1000.00");
    expect(getRow<any>("wallets", (row) => row.userId === 1)?.pendingBalance).toBe("0.00");

    const escrowPayout = await buyer.escrow.create({ sellerId: 2, amount: "80", description: "Video edit" });
    const disputePayout = await seller.escrow.openDispute({ escrowId: escrowPayout.escrowId, reason: "The buyer changed the requirements after delivery." });
    const resolvedPayout = await admin.escrow.resolveDispute({ disputeId: disputePayout.disputeId, resolution: "seller_payout" });
    expect(resolvedPayout.success).toBe(true);
    expect(getRow<any>("escrows", (row) => row.id === escrowPayout.escrowId)?.status).toBe("RELEASED");
    expect(getRow<any>("wallets", (row) => row.userId === 2)?.balance).toBe("176.00");

    const pendingTx = getRows<any>("transactions", (row) => row.referenceType === "escrow" || row.referenceType === "collateral").find((row) => row.status === "pending");
    expect(pendingTx).toBeDefined();
    if (!pendingTx) throw new Error("Expected a pending transaction for admin controls");

    const released = await admin.admin.releaseFunds({ transactionId: pendingTx.id });
    expect(released.success).toBe(true);
    expect(getRow<any>("transactions", (row) => row.id === pendingTx.id)?.status).toBe("completed");

    const refunded = await admin.admin.refundTransaction({ transactionId: pendingTx.id });
    expect(refunded.success).toBe(true);
    expect(getRow<any>("transactions", (row) => row.id === pendingTx.id)?.status).toBe("reversed");

    const walletControl = await admin.admin.listDisputes({ search: "requirements" });
    expect(walletControl.length).toBeGreaterThanOrEqual(1);
    const transactionView = await admin.admin.listTransactions({ search: "Escrow lock", status: "reversed" });
    expect(transactionView.some((tx) => tx.id === pendingTx.id)).toBe(true);

    const kycBefore = await admin.admin.getUser({ userId: 2 });
    expect(kycBefore?.kycStatus).toBe("none");

    const userBefore = getRow<any>("users", (row) => row.id === 2);
    expect(userBefore?.identityDocumentUrl).toBeTruthy();
    const approved = await admin.admin.approveKyc({ userId: 2 });
    expect(approved.success).toBe(true);
    expect(getRow<any>("users", (row) => row.id === 2)?.kycStatus).toBe("verified");

    const rejected = await admin.admin.rejectKyc({ userId: 2 });
    expect(rejected.success).toBe(true);
    expect(getRow<any>("users", (row) => row.id === 2)?.kycStatus).toBe("rejected");
    const rejectedUsers = await admin.admin.listUsers({ kycStatus: "rejected", status: "active" });
    expect(rejectedUsers.some((row) => row.id === 2)).toBe(true);

    const suspended = await admin.admin.suspendUser({ userId: 2 });
    expect(suspended.success).toBe(true);
    expect(getRow<any>("users", (row) => row.id === 2)?.status).toBe("suspended");
    const unsuspended = await admin.admin.unsuspendUser({ userId: 2 });
    expect(unsuspended.success).toBe(true);
    expect(getRow<any>("users", (row) => row.id === 2)?.status).toBe("active");

    const settingsBefore = await admin.admin.getSettings();
    expect(settingsBefore.platformName).toBe("Wathiqly");
    const settingsUpdated = await admin.admin.updateSettings({
      platformName: "Wathiqly Prime",
      platformDescription: "A hardened trust rail",
      contactEmail: "support@wathiqly.local",
      supportPhone: "+218000000123",
      escrowCommissionPercentage: "7.5",
      productCommissionPercentage: "6.0",
      minWithdrawalAmount: "15",
      isRegistrationEnabled: true,
      isEscrowEnabled: true,
      isProductMarketplaceEnabled: true,
    });
    expect(settingsUpdated.success).toBe(true);
    const settingsAfter = await admin.admin.getSettings();
    expect(settingsAfter.platformName).toBe("Wathiqly Prime");
    expect(settingsAfter.escrowCommissionPercentage).toBe("7.5");
    expect(settingsAfter.minWithdrawalAmount).toBe("15");

    const notification = await admin.admin.sendNotification({ userId: 1, title: "Platform update", message: "Your escrow has been reviewed", link: "/dashboard" });
    expect(notification.success).toBe(true);
    const globalNotification = await admin.admin.sendGlobalNotification({ title: "Broadcast", message: "Maintenance complete", link: "/faq" });
    expect(globalNotification.success).toBe(true);
    expect(shared.state.tables.notifications.length).toBeGreaterThanOrEqual(3);

    const logs = await admin.admin.listLogs({ limit: 20 });
    expect(logs.length).toBeGreaterThan(0);

    const commissionStats = await admin.admin.getCommissionStats();
    expect(Number(commissionStats.totalCommission)).toBeGreaterThan(0);
    expect(commissionStats.escrowCount).toBeGreaterThanOrEqual(2);

    const me = await buyer.auth.me();
    expect(me?.id).toBe(1);

    const logout = await buyer.auth.logout();
    expect(logout.success).toBe(true);
    expect(buyerRes.clearCookie).toHaveBeenCalledWith(expect.any(String), { path: "/" });
  });

  it("covers trust signals, OTP verification, product search, timed links, smart escrow surfaces, and DaaS stats", async () => {
    const { caller: buyer } = makeCaller({ id: 1, role: "user" }, { "user-agent": "flow-check/1.0" });
    const { caller: admin } = makeCaller({ id: 99, role: "admin" });

    const otp = createOtpChallenge(1);
    expect(otp.challengeId).toBeTruthy();
    const verified = await buyer.verify.checkOtp({ code: otp.code });
    expect(verified.success).toBe(true);
    expect(getRow<any>("users", (row) => row.id === 1)?.phoneVerifiedAt).toBeInstanceOf(Date);

    const status = await buyer.verify.getStatus();
    expect(status.phoneVerified).toBe(true);
    expect(status.kycStatus).toBe("none");

    const trustProfile = await buyer.trust.getTrustProfile({});
    expect(trustProfile.userId).toBe(1);
    expect(typeof trustProfile.score.currentScore).toBe("string");
    expect(Array.isArray(trustProfile.badges)).toBe(true);

    const pattern = await buyer.behavioral.getPatternStatus();
    expect(pattern.patternHash).toHaveLength(24);
    expect(typeof pattern.isLocked).toBe("boolean");

    const search = await buyer.products.searchProducts({ query: "design", type: "all", limit: 10 });
    expect(search.length).toBeGreaterThan(0);
    const product = await buyer.products.getById({ type: "digital", id: 1 });
    expect(product?.title).toContain("Digital Toolkit");

    const toggled = await admin.admin.toggleProductStatus({ productId: 1, type: "digital", isActive: false });
    expect(toggled.success).toBe(true);
    expect(getRow<any>("digitalProducts", (row) => row.id === 1)?.isActive).toBe(false);

    const timedLink = await buyer.timedLinks.create({
      title: "Escrow link",
      description: "Used in e2e flow",
      amount: "120",
      dealType: "service",
      commissionPercentage: "2.5",
      commissionPaidBy: "buyer",
      expirationHours: 4,
      specifications: { revision: 2 },
    });
    expect(timedLink.linkToken).toMatch(/^link_/);
    const fetchedLink = await buyer.timedLinks.getByToken({ token: timedLink.linkToken });
    expect(fetchedLink?.status).toBe("active");
    const usedLink = await buyer.timedLinks.use({ token: timedLink.linkToken });
    expect(usedLink.success).toBe(true);
    expect(getRow<any>("timedLinks", (row) => row.linkToken === timedLink.linkToken)?.status).toBe("used");

    const milestones = await buyer.smartEscrow.getMilestones({ escrowId: 1 });
    expect(milestones).toHaveLength(2);
    expect(milestones[0]?.title).toBe("Planning");

    const devices = await buyer.smartEscrow.getDevices({ escrowId: 1 });
    expect(devices).toHaveLength(1);
    const chainLogs = await buyer.smartEscrow.getBlockchainLogs({ escrowId: 1 });
    expect(chainLogs).toHaveLength(2);

    const inspection = await buyer.inspectionService.requestInspection({ escrowId: 1, summary: "Need quality check" });
    expect(inspection.success).toBe(true);
    const report = await buyer.inspectionService.getReport({ escrowId: 1 });
    expect(report?.status).toBe("pending");
    const approved = await admin.inspectionService.approveReport({ reportId: inspection.reportId });
    expect(approved.success).toBe(true);
    expect(getRow<any>("inspectionReports", (row) => row.id === inspection.reportId)?.status).toBe("approved");

    const stats = await admin.diaas.getClientStats({ clientId: "abcdef1234567890", clientSecret: ENV.serverSecret });
    expect(stats.clientName).toBe("Client abcdef");
    expect(stats.stats.totalRequests).toBeGreaterThan(0);
    await expect(admin.diaas.getClientStats({ clientId: "abcdef1234567890", clientSecret: "wrong-secret" })).rejects.toThrow("Unauthorized client credentials");

    const owner = await admin.system.notifyOwner({ title: "System alert", content: "Notification delivered", });
    expect(owner.success).toBe(true);
    expect(shared.state.tables.notifications.some((row) => row.title === "System alert")).toBe(true);
  });
});
