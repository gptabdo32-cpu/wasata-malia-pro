import { desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { adminLogs, auditLogs, chatConversations, digitalProducts, physicalProducts, services, vehicles, platformSettings, transactions, disputes, disputeMessages, disputeEvidence, notifications, users, escrows } from "../../infrastructure/db/schema";
import { adminProcedure, router } from "../trpc/trpc";
import { getCurrentUserRow, userSummary } from "./routerShared.identity";
import { normalizeProduct, normalizeText } from "./routerShared.product";
import { assertSafeLink } from "../../infrastructure/policy/access";
import { safeStringify } from "../../infrastructure/utils/safeJson";

export const adminRouter = router({
  listUsers: adminProcedure.input(z.object({ search: z.string().optional().default(""), kycStatus: z.enum(["all", "none", "pending", "verified", "rejected"]).default("all"), status: z.enum(["all", "active", "suspended"]).default("all") }).default({ search: "", kycStatus: "all", status: "all" })).query(async ({ input }) => {
    const db = await getDb();
    const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(200);
    const q = normalizeText(input.search).toLowerCase();
    return rows.filter((row) => {
      const user = userSummary(row);
      const matchesSearch = !q || [user?.name, user?.email, user?.phone].some((v) => typeof v === "string" && v.toLowerCase().includes(q));
      const matchesKyc = input.kycStatus === "all" || user?.kycStatus === input.kycStatus;
      const matchesStatus = input.status === "all" || user?.status === input.status;
      return matchesSearch && matchesKyc && matchesStatus;
    }).map(userSummary);
  }),
  getUser: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => {
    const row = await getCurrentUserRow(input.userId);
    return row ? userSummary(row) : null;
  }),
  suspendUser: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      await tx.update(users).set({ status: "suspended", updatedAt: new Date() } as any).where(eq(users.id, input.userId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "suspend_user", targetType: "user", targetId: input.userId, details: safeStringify({ userId: input.userId }) } as any);
      return { success: true } as const;
    });
  }),
  unsuspendUser: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      await tx.update(users).set({ status: "active", updatedAt: new Date() } as any).where(eq(users.id, input.userId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "unsuspend_user", targetType: "user", targetId: input.userId, details: safeStringify({ userId: input.userId }) } as any);
      return { success: true } as const;
    });
  }),
  approveKyc: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new Error("User not found");
      if (!user.identityDocumentUrl) {
        throw new Error("Identity document required before approving KYC");
      }
      if (user.status === "suspended") {
        throw new Error("Suspended users cannot be KYC verified");
      }
      await tx.update(users).set({ kycStatus: "verified", identityVerifiedAt: new Date(), updatedAt: new Date() } as any).where(eq(users.id, input.userId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "approve_kyc", targetType: "user", targetId: input.userId, details: safeStringify({ before: user.kycStatus, after: "verified", identityDocumentUrl: Boolean(user.identityDocumentUrl) }) } as any);
      return { success: true } as const;
    });
  }),
  rejectKyc: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new Error("User not found");
      await tx.update(users).set({ kycStatus: "rejected", identityVerifiedAt: null, updatedAt: new Date() } as any).where(eq(users.id, input.userId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "reject_kyc", targetType: "user", targetId: input.userId, details: safeStringify({ before: user.kycStatus, after: "rejected" }) } as any);
      return { success: true } as const;
    });
  }),
  listTransactions: adminProcedure.input(z.object({ search: z.string().optional().default(""), status: z.enum(["all", "pending", "completed", "failed", "reversed"]).default("all") }).default({ search: "", status: "all" })).query(async ({ input }) => {
    const db = await getDb();
    const rows = await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(200);
    const q = normalizeText(input.search).toLowerCase();
    return rows.filter((row) => {
      const hay = `${row.description ?? ""} ${row.reference ?? ""} ${row.referenceType ?? ""}`.toLowerCase();
      return (!q || hay.includes(q)) && (input.status === "all" || row.status === input.status);
    }).map((row) => ({ ...row, amount: String(row.amount) }));
  }),
  getTransaction: adminProcedure.input(z.object({ transactionId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    const [row] = await db.select().from(transactions).where(eq(transactions.id, input.transactionId)).limit(1);
    return row ? { ...row, amount: String(row.amount) } : null;
  }),
  releaseFunds: adminProcedure.input(z.object({ transactionId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [row] = await tx.select().from(transactions).where(eq(transactions.id, input.transactionId)).limit(1);
      if (!row) throw new Error("Transaction not found");
      if (row.status !== "pending") throw new Error("Only pending transactions can be released");
      await tx.update(transactions).set({ status: "completed" } as any).where(eq(transactions.id, input.transactionId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "release_funds", targetType: "transaction", targetId: input.transactionId, details: safeStringify({ before: row.status, after: "completed" }) } as any);
      return { success: true } as const;
    });
  }),
  refundTransaction: adminProcedure.input(z.object({ transactionId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [row] = await tx.select().from(transactions).where(eq(transactions.id, input.transactionId)).limit(1);
      if (!row) throw new Error("Transaction not found");
      if (row.status !== "completed") throw new Error("Only completed transactions can be refunded");
      await tx.update(transactions).set({ status: "reversed" } as any).where(eq(transactions.id, input.transactionId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "refund_transaction", targetType: "transaction", targetId: input.transactionId, details: safeStringify({ before: row.status, after: "reversed" }) } as any);
      return { success: true } as const;
    });
  }),
  listDisputes: adminProcedure.input(z.object({ search: z.string().optional().default("") }).default({ search: "" })).query(async ({ input }) => {
    const db = await getDb();
    const disputesRows = await db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(200);
    const q = normalizeText(input.search).toLowerCase();
    const filtered = disputesRows.filter((row) => !q || String(row.reason ?? "").toLowerCase().includes(q) || String(row.id).includes(q));

    if (filtered.length === 0) return [];

    const escrowIds = Array.from(new Set(filtered.map((row) => row.escrowId)));
    const escrowRows = (escrowIds.length
      ? await db.select().from(escrows).where(or(...escrowIds.map((id) => eq(escrows.id, id))))
      : []) as Array<typeof escrows.$inferSelect>;
    const userIds = Array.from(
      new Set(
        escrowRows.flatMap((row) => [row.buyerId, row.sellerId]).filter((value): value is number => Number.isInteger(value))
      )
    );
    const userRows = (userIds.length
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(or(...userIds.map((id) => eq(users.id, id))))
      : []) as Array<{ id: number; name: string | null; email: string | null }>;
    const messageRows = (escrowIds.length ? await db.select().from(disputeMessages).where(or(...escrowIds.map((id) => eq(disputeMessages.escrowId, id)))) : []) as Array<typeof disputeMessages.$inferSelect>;
    const evidenceRows = (escrowIds.length ? await db.select().from(disputeEvidence).where(or(...escrowIds.map((id) => eq(disputeEvidence.escrowId, id)))) : []) as Array<typeof disputeEvidence.$inferSelect>;

    const escrowById = new Map<number, typeof escrows.$inferSelect>(escrowRows.map((row) => [row.id, row] as const));
    const userById = new Map<number, { id: number; name: string | null; email: string | null }>(userRows.map((row) => [row.id, row] as const));
    const messagesByEscrowId = new Map<number, typeof messageRows>();
    const evidenceByEscrowId = new Map<number, typeof evidenceRows>();
    for (const row of messageRows) {
      const list = messagesByEscrowId.get(row.escrowId) ?? [];
      list.push(row);
      messagesByEscrowId.set(row.escrowId, list);
    }
    for (const row of evidenceRows) {
      const list = evidenceByEscrowId.get(row.escrowId) ?? [];
      list.push(row);
      evidenceByEscrowId.set(row.escrowId, list);
    }

    return filtered.map((row: typeof disputes.$inferSelect) => {
      const escrow = escrowById.get(row.escrowId);
      const buyer = escrow ? userById.get(escrow.buyerId) : null;
      const seller = escrow ? userById.get(escrow.sellerId) : null;
      return {
        id: row.id,
        escrowId: row.escrowId,
        title: escrow?.title ?? `Escrow #${row.escrowId}`,
        amount: String(escrow?.amount ?? "0.00"),
        reason: row.reason,
        status: row.status,
        resolution: row.resolution ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        buyerId: escrow?.buyerId ?? null,
        sellerId: escrow?.sellerId ?? null,
        buyerName: buyer?.name ?? `User ${escrow?.buyerId ?? 0}`,
        sellerName: seller?.name ?? `User ${escrow?.sellerId ?? 0}`,
        buyerEmail: buyer?.email ?? null,
        sellerEmail: seller?.email ?? null,
        messages: (messagesByEscrowId.get(row.escrowId) ?? []).map((message: typeof disputeMessages.$inferSelect) => ({
          ...message,
          senderName: userById.get(message.senderId)?.name ?? `User ${message.senderId}`,
        })),
        evidence: (evidenceByEscrowId.get(row.escrowId) ?? []).map((item: typeof disputeEvidence.$inferSelect) => ({
          ...item,
          uploaderName: userById.get(item.uploaderId)?.name ?? `User ${item.uploaderId}`,
        })),
      };
    });
  }),

  resolveDispute: adminProcedure.input(z.object({
    disputeId: z.number().int().positive(),
    resolution: z.enum(["buyer_refund", "seller_payout", "split"]).optional(),
    decision: z.enum(["buyer", "seller"]).optional(),
    resolutionText: z.string().min(1).max(5000).optional(),
  }).refine((input) => Boolean(input.resolution || input.decision), { message: "Resolution or decision is required" })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [row] = await tx.select().from(disputes).where(eq(disputes.id, input.disputeId)).limit(1);
      if (!row) throw new Error("Dispute not found");
      if (row.status === "resolved") throw new Error("Dispute already resolved");

      const resolution = input.resolution ?? (input.decision === "buyer" ? "buyer_refund" : "seller_payout");
      const escrowStatus = resolution === "buyer_refund" ? "REFUNDED" : "RELEASED";
      const [escrowRow] = await tx.select().from(escrows).where(eq(escrows.id, row.escrowId)).limit(1);
      if (!escrowRow) throw new Error("Escrow not found for dispute");

      await tx.update(disputes).set({ status: "resolved", resolution, adminId: ctx.user.id, updatedAt: new Date() } as any).where(eq(disputes.id, input.disputeId));
      await tx.update(escrows).set({
        status: escrowStatus,
        disputeResolution: input.resolutionText ?? row.reason,
        disputeResolvedAt: new Date(),
        updatedAt: new Date(),
      } as any).where(eq(escrows.id, row.escrowId));
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "resolve_dispute", targetType: "dispute", targetId: input.disputeId, details: safeStringify({ before: row.status, after: "resolved", resolution, resolutionText: input.resolutionText ?? null }) } as any);
      return { success: true, resolution, escrowStatus } as const;
    });
  }),

  listProducts: adminProcedure.input(z.object({ search: z.string().optional().default("") }).default({ search: "" })).query(async ({ input }) => {
    const db = await getDb();
    const [d, p, s, v] = await Promise.all([db.select().from(digitalProducts), db.select().from(physicalProducts), db.select().from(services), db.select().from(vehicles)]);
    const q = normalizeText(input.search).toLowerCase();
    const all = [
      ...d.map((row) => normalizeProduct(row, "digital")),
      ...p.map((row) => normalizeProduct(row, "physical")),
      ...s.map((row) => normalizeProduct(row, "service")),
      ...v.map((row) => normalizeProduct(row, "vehicle")),
    ].filter(Boolean);
    return !q ? all : all.filter((row: any) => `${row.title} ${row.category ?? ""} ${row.city ?? ""}`.toLowerCase().includes(q));
  }),
  toggleProductStatus: adminProcedure.input(z.object({ productId: z.number().int().positive(), type: z.enum(["digital", "physical", "service", "vehicle"]), isActive: z.boolean() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    const table = input.type === "digital" ? digitalProducts : input.type === "physical" ? physicalProducts : input.type === "service" ? services : vehicles;
    await db.update(table as any).set({ isActive: input.isActive } as any).where(eq((table as any).id, input.productId));
    await db.insert(adminLogs).values({ adminId: ctx.user.id, action: "toggle_product_status", targetType: input.type, targetId: input.productId, details: safeStringify(input) } as any);
    return { success: true } as const;
  }),
  listLogs: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).default({ limit: 50 })).query(async ({ input }) => {
    const db = await getDb();
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input.limit);
  }),
  getCommissionStats: adminProcedure.query(async () => {
    const db = await getDb();
    const rows = await db.select({ amount: escrows.commissionAmount }).from(escrows);
    const total = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return { totalCommission: total.toFixed(2), escrowCount: rows.length };
  }),
  getSettings: adminProcedure.query(async () => {
    const db = await getDb();
    const [settings] = await db.select().from(platformSettings).limit(1);
    return settings
      ? {
          platformName: settings.siteName,
          platformDescription: "Wathiqly secure commerce and trust rail",
          contactEmail: "support@wathiqly.local",
          supportPhone: "+218000000000",
          escrowCommissionPercentage: String(settings.escrowFeePercentage),
          productCommissionPercentage: "5.0",
          minWithdrawalAmount: String(settings.minWithdrawalAmount),
          isRegistrationEnabled: true,
          isEscrowEnabled: true,
          isProductMarketplaceEnabled: true,
        }
      : {
          platformName: "Wathiqly",
          platformDescription: "Wathiqly secure commerce and trust rail",
          contactEmail: "support@wathiqly.local",
          supportPhone: "+218000000000",
          escrowCommissionPercentage: "5.0",
          productCommissionPercentage: "5.0",
          minWithdrawalAmount: "10.00",
          isRegistrationEnabled: true,
          isEscrowEnabled: true,
          isProductMarketplaceEnabled: true,
        };
  }),
  updateSettings: adminProcedure.input(z.object({
    platformName: z.string().min(1).optional(),
    platformDescription: z.string().optional(),
    contactEmail: z.string().email().optional(),
    supportPhone: z.string().optional(),
    escrowCommissionPercentage: z.union([z.string(), z.number()]).optional(),
    productCommissionPercentage: z.union([z.string(), z.number()]).optional(),
    minWithdrawalAmount: z.union([z.string(), z.number()]).optional(),
    isRegistrationEnabled: z.boolean().optional(),
    isEscrowEnabled: z.boolean().optional(),
    isProductMarketplaceEnabled: z.boolean().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(platformSettings).limit(1);
      const nextRecord = {
        siteName: input.platformName ?? existing?.siteName ?? "Wathiqly",
        maintenanceMode: Boolean(existing?.maintenanceMode ?? false),
        escrowFeePercentage: String(input.escrowCommissionPercentage ?? existing?.escrowFeePercentage ?? "5.00"),
        minWithdrawalAmount: String(input.minWithdrawalAmount ?? existing?.minWithdrawalAmount ?? "10.00"),
      };
      if (existing) {
        await tx.update(platformSettings).set({ ...nextRecord, updatedAt: new Date() } as any).where(eq(platformSettings.id, existing.id));
      } else {
        await tx.insert(platformSettings).values(nextRecord as any);
      }
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "update_settings", targetType: "platform", targetId: 1, details: safeStringify(input) } as any);
      return { success: true } as const;
    });
  }),
  sendNotification: adminProcedure.input(z.object({ userId: z.number().int().positive(), title: z.string().min(1), message: z.string().min(1), link: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const link = input.link ? assertSafeLink(input.link, "notification link") : null;
      await tx.insert(notifications).values({ userId: input.userId, type: "system", title: input.title, message: input.message, link } as any);
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "send_notification", targetType: "user", targetId: input.userId, details: safeStringify(input) } as any);
      return { success: true } as const;
    });
  }),
  sendGlobalNotification: adminProcedure.input(z.object({ title: z.string().min(1), message: z.string().min(1), link: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const rows = await tx.select({ id: users.id }).from(users).limit(200);
      const link = input.link ? assertSafeLink(input.link, "notification link") : null;
      for (const row of rows) {
        await tx.insert(notifications).values({ userId: row.id, type: "system", title: input.title, message: input.message, link } as any);
      }
      await tx.insert(adminLogs).values({ adminId: ctx.user.id, action: "send_global_notification", targetType: "system", targetId: 0, details: safeStringify(input) } as any);
      return { success: true, recipientCount: rows.length } as const;
    });
  }),
});

export const mediatorAdminRouter = router({
  getPendingRequests: adminProcedure.query(async () => {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT mr.*, c.buyerId, c.sellerId
      FROM mediator_requests mr
      LEFT JOIN chatConversations c ON c.id = mr.conversationId
      WHERE mr.status IN ('pending', 'accepted', 'active')
      ORDER BY mr.createdAt DESC
      LIMIT 100
    ` as any);
    const rows = Array.isArray((result as any)[0]) ? (result as any)[0] : (result as any).rows ?? [];
    return rows;
  }),
});
