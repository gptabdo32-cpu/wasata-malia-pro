import type { Request } from "express";
import cookie from "cookie";
import { PLATFORM_POLICY } from "@shared/platform";
import { ENV as ConfigEnv } from "../config/env";

export type RequestIdentity = {
  id: number;
  role?: string | null;
  source: "bearer" | "cookie" | "development-header";
};

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization?.trim();
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token || null;
}

export function extractSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const parsed = cookie.parse(cookieHeader);
  const token = parsed[PLATFORM_POLICY.sessionCookieName];
  return token?.trim() || null;
}

export function extractDevelopmentIdentity(req: Request): RequestIdentity | null {
  if (!ConfigEnv.allowDevelopmentIdentityHeaders) return null;
  const userIdHeader = Number(req.headers["x-user-id"] ?? 0);
  if (!Number.isInteger(userIdHeader) || userIdHeader <= 0) return null;
  const rawRole = req.headers["x-user-role"]?.toString().trim();
  const role = rawRole === "admin" ? "admin" : rawRole === "user" ? "user" : null;
  if (!role) return null;
  return { id: userIdHeader, role, source: "development-header" };
}
