import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { digitalProducts, physicalProducts, services, vehicles, timedLinks } from "../../infrastructure/db/schema";
import { publicProcedure, protectedProcedure, router } from "../trpc/trpc";
import { normalizeProduct, normalizeText } from "./routerShared.product";
import { parseAmount, makeId } from "./routerShared.finance";

export const productsRouter = router({
  searchProducts: publicProcedure.input(z.object({ query: z.string().optional().default(""), type: z.enum(["all", "digital", "physical", "service", "vehicle"]).default("all"), limit: z.number().int().min(1).max(100).default(20) }).default({ query: "", type: "all", limit: 20 })).query(async ({ input }) => {
    const db = await getDb();
    const q = normalizeText(input.query).toLowerCase();
    const contains = (value: unknown) => typeof value === "string" && value.toLowerCase().includes(q);
    const [digitals, physicals, servicesRows, vehiclesRows] = await Promise.all([
      db.select().from(digitalProducts).limit(input.limit),
      db.select().from(physicalProducts).limit(input.limit),
      db.select().from(services).limit(input.limit),
      db.select().from(vehicles).limit(input.limit),
    ]);
    const items = [
      ...(input.type === "all" || input.type === "digital" ? digitals.map((row) => normalizeProduct(row, "digital")).filter((row) => !q || contains(row?.title) || contains(row?.category)) : []),
      ...(input.type === "all" || input.type === "physical" ? physicals.map((row) => normalizeProduct(row, "physical")).filter((row) => !q || contains(row?.title) || contains(row?.category) || contains(row?.city)) : []),
      ...(input.type === "all" || input.type === "service" ? servicesRows.map((row) => normalizeProduct(row, "service")).filter((row) => !q || contains(row?.title) || contains(row?.category)) : []),
      ...(input.type === "all" || input.type === "vehicle" ? vehiclesRows.map((row) => normalizeProduct(row, "vehicle")).filter((row) => !q || contains(row?.title) || contains(row?.city) || contains(row?.category)) : []),
    ];
    return items.slice(0, input.limit);
  }),
  getById: publicProcedure.input(z.object({ type: z.enum(["digital", "physical", "service", "vehicle"]), id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    const table = input.type === "digital" ? digitalProducts : input.type === "physical" ? physicalProducts : input.type === "service" ? services : vehicles;
    const [row] = await db.select().from(table).where(eq((table as any).id, input.id)).limit(1);
    return normalizeProduct(row, input.type);
  }),
});

export const timedLinksRouter = router({
  create: protectedProcedure.input(z.object({ title: z.string().min(1).max(255), description: z.string().optional().default(""), amount: z.string().min(1), dealType: z.string().optional(), commissionPercentage: z.string().optional(), commissionPaidBy: z.enum(["buyer", "seller", "split"]).default("buyer"), expirationHours: z.number().int().min(1).max(720).default(2), specifications: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const amount = parseAmount(input.amount);
    const linkToken = makeId("link");
    await db.insert(timedLinks).values({ linkToken, createdBy: ctx.user.id, title: input.title.slice(0, 255), amount: amount.toFixed(2), expiresAt: new Date(Date.now() + input.expirationHours * 60 * 60 * 1000), status: "active" } as any);
    return { linkToken, shareUrl: `/timed-link/${linkToken}` } as const;
  }),
  getByToken: publicProcedure.input(z.object({ token: z.string().min(4) })).query(async ({ input }) => {
    const db = await getDb();
    const [link] = await db.select().from(timedLinks).where(eq(timedLinks.linkToken, input.token)).limit(1);
    if (!link) return null;
    return {
      ...link,
      commissionPercentage: "2.5",
      specifications: {},
      isExpired: link.expiresAt ? new Date(link.expiresAt).getTime() < Date.now() : false,
      isUsed: String(link.status) === "used",
    };
  }),
  use: protectedProcedure.input(z.object({ token: z.string().min(4) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    return await db.transaction(async (tx) => {
      const [link] = await tx.select().from(timedLinks).where(eq(timedLinks.linkToken, input.token)).limit(1);
      if (!link) throw new Error("Timed link not found");
      if (String(link.status) !== "active") throw new Error("Timed link already used");
      if (new Date(link.expiresAt).getTime() < Date.now()) throw new Error("Timed link expired");
      await tx.update(timedLinks).set({ status: "used" } as any).where(eq(timedLinks.id, link.id));
      return { success: true, escrowId: link.id, amount: String(link.amount) } as const;
    });
  }),
});
