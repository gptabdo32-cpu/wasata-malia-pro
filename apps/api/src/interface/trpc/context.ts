import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { createCorrelationId } from "@shared/ids";
import { getDb } from "../../infrastructure/db";
import { schema } from "../../infrastructure/db/schema";
import * as storage from "../../infrastructure/storage";
import * as encryption from "../../infrastructure/external-services/encryption.js";
import { resolveUserFromRequest } from "../../infrastructure/auth/session";

export type TrpcUser = { id: number; role: "user" | "admin" };
export type TrpcContext = {
  correlationId: string;
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: TrpcUser | null;
  db: Awaited<ReturnType<typeof getDb>>;
  schema: typeof schema;
  storage: typeof storage;
  encryption: typeof encryption;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const resolvedUser = await resolveUserFromRequest(opts.req);
  return {
    correlationId: opts.req.headers["x-correlation-id"]?.toString() || createCorrelationId(),
    req: opts.req,
    res: opts.res,
    user: resolvedUser?.id ? { id: resolvedUser.id, role: resolvedUser.role === "admin" ? "admin" : "user" } : null,
    db: await getDb(),
    schema,
    storage,
    encryption,
  };
}
