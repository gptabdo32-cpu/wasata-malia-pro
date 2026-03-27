import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xssClean from "xss-clean";
import { jwtVerify, SignJWT } from "jose";
import crypto from "node:crypto";
import { PLATFORM_POLICY, PLATFORM_RUNTIME } from "@shared/platform";
import { ENV as ConfigEnv } from "../config/env";
import { extractBearerToken, extractDevelopmentIdentity, extractSessionToken } from "../auth/token";
import { stableSerialize } from "../utils/safeJson";

const textEncoder = new TextEncoder();
const jwtKey = textEncoder.encode(ConfigEnv.jwtSecret);
const eventKey = textEncoder.encode(ConfigEnv.serverSecret);

export const helmetConfig = helmet({
  contentSecurityPolicy: (() => {
    const directives: Record<string, string[]> = {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https:", "data:"],
    };
    if (ConfigEnv.isProduction) directives.upgradeInsecureRequests = [];
    return { useDefaults: true, directives };
  })(),
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
  hsts: ConfigEnv.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

export const mongoSanitizeMiddleware = mongoSanitize();
export const xssCleanMiddleware = xssClean() as unknown as (req: Request, res: Response, next: NextFunction) => void;
export const hppMiddleware = hpp();
export const securityHeadersMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
};

function normalizeOrigins(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const allowedOrigins = normalizeOrigins(ConfigEnv.corsOrigins);
const devOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export const corsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    if (!ConfigEnv.isProduction && devOriginPattern.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Correlation-Id", "X-User-Id", "X-User-Role"],
};

function createLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
  });
}

export const generalLimiter = createLimiter(60_000, ConfigEnv.isProduction ? 120 : 1000);
export const authLimiter = createLimiter(60_000, ConfigEnv.isProduction ? 20 : 200);

export type MinimalUser = { id: number; role?: string | null };
export type VerifiedJwtPayload = { id: number; role?: string; type?: string; iat?: number; exp?: number };
export type AuthenticatedRequest = Request & { user?: MinimalUser };

export async function signJWT(payload: VerifiedJwtPayload, expiresIn = "2h") {
  if (typeof payload.id !== "number" || !Number.isInteger(payload.id) || payload.id <= 0) {
    throw new Error("JWT payload requires a valid numeric id");
  }
  return await new SignJWT({ ...payload, type: payload.type ?? "session" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(String(payload.id))
    .setIssuer(ConfigEnv.appId)
    .setAudience(ConfigEnv.appId)
    .setExpirationTime(expiresIn)
    .sign(jwtKey);
}

export async function verifyJWT(token: string): Promise<VerifiedJwtPayload | null> {
  if (!token || token.split(".").length !== 3) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey, {
      algorithms: ["HS256"],
      issuer: ConfigEnv.appId,
      audience: ConfigEnv.appId,
    });
    if (payload.type && payload.type !== "session") return null;
    const id = typeof payload.id === "number" ? payload.id : Number(payload.sub ?? 0);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { ...payload, id } as unknown as VerifiedJwtPayload;
  } catch {
    return null;
  }
}

export async function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req) ?? extractSessionToken(req);
  let payload = token ? await verifyJWT(token) : null;
  if (!payload?.id && !ConfigEnv.isProduction) {
    const devIdentity = extractDevelopmentIdentity(req);
    if (devIdentity) {
      payload = { id: devIdentity.id, role: devIdentity.role ?? "user", type: devIdentity.source };
    }
  }
  if (!payload?.id) {
    return res.status(401).json({ error: PLATFORM_POLICY.authRequiredMessage, code: "UNAUTHORIZED" });
  }
  req.user = { id: payload.id, role: payload.role ?? "user" };
  next();
}

export async function adminGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await authGuard(req, res, () => {
    const user = req.user;
    if (user?.role === "admin") return next();
    return res.status(403).json({ error: PLATFORM_POLICY.adminRequiredMessage, code: "FORBIDDEN" });
  });
}

export function validate<T = unknown>(schema: { parse: (input: unknown) => T }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({ error: "Validation failed", details: error instanceof Error ? error.message : "Invalid input" });
    }
  };
}

export function sanitize(input: string): string {
  return typeof input === "string" ? input.trim().replace(/[<>"']/g, "") : String(input ?? "");
}

function hmac(payload: unknown) {
  return crypto.createHmac("sha256", eventKey).update(stableSerialize(payload)).digest("base64url");
}

export class EventSecurity {
  static sign(payload: unknown) {
    return hmac(payload);
  }
  static validate(payload: unknown, signature: string) {
    const expected = hmac(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature || "");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

export class AccessControl {
  static ensureEscrowParticipant(userId: number, escrow: { buyerId: number; sellerId: number }) {
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) throw new Error("Access denied");
  }
  static ensureOwnership(userId: number, ownerId: number) {
    if (userId !== ownerId) throw new Error("Access denied");
  }
  static ensureRole(userRole: string | undefined, requiredRole: string) {
    if (userRole !== requiredRole) throw new Error("Access denied");
  }
}

export const ENV = {
  ...PLATFORM_RUNTIME,
  isProduction: ConfigEnv.isProduction,
} as const;
