import { eq } from "drizzle-orm";
import { getDb } from "../../infrastructure/db";
import { users, wallets, reviews } from "../../infrastructure/db/schema";
import { riskEngine } from "../../infrastructure/risk/RiskEngine";

export async function getCurrentUserRow(userId: number) {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function ensureWallet(userId: number) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const [existing] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing) return existing;
  await db.insert(wallets).values({ userId, balance: "0.00", pendingBalance: "0.00", totalEarned: "0.00", totalWithdrawn: "0.00" } as any);
  const [created] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return created ?? null;
}

export type EnsureUserOptions = { createIfMissing?: boolean };

export async function ensureUserRow(
  input: { id: number; name?: string | null; email?: string | null },
  options: EnsureUserOptions = {}
) {
  const db = await getDb();
  const [existing] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
  if (existing) return existing;
  if (!options.createIfMissing) return null;

  await db.insert(users).values({
    id: input.id,
    openId: `open_${input.id}`,
    name: input.name ?? `المستخدم #${input.id}`,
    email: input.email ?? null,
    role: "user",
    userType: "buyer",
    status: "active",
    kycStatus: "none",
    phoneVerifiedAt: null,
    identityVerifiedAt: null,
    isTrustedSeller: false,
  } as any);
  const [created] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
  return created ?? null;
}

export async function createUserRow(input: { id: number; name?: string | null; email?: string | null }) {
  return await ensureUserRow(input, { createIfMissing: true });
}

export function userSummary(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? row.fullName ?? `المستخدم #${row.id}`,
    fullName: row.name ?? row.fullName ?? `المستخدم #${row.id}`,
    email: row.email ?? null,
    phone: row.phone ?? null,
    city: row.city ?? null,
    bio: row.bio ?? null,
    role: row.role ?? "user",
    status: row.status ?? "active",
    kycStatus: row.kycStatus ?? "none",
    verificationLevel: row.kycStatus === "verified" ? 2 : row.phoneVerifiedAt ? 1 : 0,
    userType: row.userType ?? (row.isTrustedSeller ? "both" : "buyer"),
    isTrustedSeller: Boolean(row.isTrustedSeller),
    isIdentityVerified: row.kycStatus === "verified",
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
    lastSignedIn: row.lastSignedIn ?? new Date(),
  };
}

export async function listTrustSignals(userId: number) {
  const db = await getDb();
  const profile = await riskEngine.buildTrustProfile(userId);
  const reviewRows = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.revieweeId, userId));
  const averageRating = reviewRows.length ? reviewRows.reduce((sum, row) => sum + Number(row.rating), 0) / reviewRows.length : 0;
  return { risk: profile, averageRating, reviewCount: reviewRows.length };
}
