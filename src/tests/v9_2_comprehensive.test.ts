import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PLATFORM_NAME, PLATFORM_POLICY, PLATFORM_RUNTIME, PLATFORM_VERSION, SOURCE_OF_TRUTH, THEME_STORAGE_KEY } from "../../packages/shared/platform";
import { COOKIE_NAME, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "../../packages/shared/const";
import { createCorrelationId, createRequestId, createUuid } from "../../packages/shared/ids";
import * as sharedIndex from "../../packages/shared";
import { extractBearerToken, extractDevelopmentIdentity, extractSessionToken } from "../../apps/api/src/infrastructure/auth/token";
import { resolveUserFromRequest } from "../../apps/api/src/infrastructure/auth/session";
import { AccessControl, EventSecurity, adminGuard, authGuard, corsOptions, sanitize, securityHeadersMiddleware, signJWT, validate, verifyJWT } from "../../apps/api/src/infrastructure/security";
import { assertAdmin, assertAuthenticated, assertOwnerOrAdmin, assertParticipantOrAdmin, assertPositiveAmount, assertTrustedUploadUrl } from "../../apps/api/src/infrastructure/policy/access";
import { Logger } from "../../apps/api/src/infrastructure/observability/Logger";
import { createRequestTelemetryMiddleware } from "../../apps/api/src/infrastructure/observability/http";
import { encryptData, decryptData } from "../../apps/api/src/infrastructure/external-services/encryption.js";
import { rulesEngine, evaluateRules } from "../../apps/api/src/infrastructure/external-services/rulesEngine.js";
import { sanitizeHtml, sanitizeObject } from "../../apps/web/src/lib/security";
import { PaymentService } from "../../apps/api/src/application/services/payment.service.ts";
import { InspectionService } from "../../apps/api/src/application/services/inspection.service.ts";
import { ShipmentService } from "../../apps/api/src/application/services/shipment.service.ts";
import { systemRouter } from "../../apps/api/src/interface/api/systemRouter";
import { appRouter } from "../../apps/api/src/interface/api/routers";
import { schema, databaseSchema, users, wallets, escrows, chatConversations, chatMessages, auditLogs } from "../../apps/api/src/infrastructure/db/schema";
import { ledgerAccounts, ledgerTransactions, ledgerEntries, accountBalancesCache } from "../../apps/api/src/infrastructure/db/schema_ledger";
import { outboxEvents, idempotencyRecords } from "../../apps/api/src/infrastructure/db/schema_outbox";
import { sagaStates } from "../../apps/api/src/infrastructure/db/schema_saga";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ALLOWED_UPLOAD_HOSTS: process.env.ALLOWED_UPLOAD_HOSTS,
};
const originalCwd = process.cwd();

function restoreEnv() {
  if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.NODE_ENV;

  if (originalEnv.ALLOWED_UPLOAD_HOSTS === undefined) delete process.env.ALLOWED_UPLOAD_HOSTS;
  else process.env.ALLOWED_UPLOAD_HOSTS = originalEnv.ALLOWED_UPLOAD_HOSTS;
}

afterEach(() => {
  restoreEnv();
  if (process.cwd() !== originalCwd) process.chdir(originalCwd);
  vi.restoreAllMocks();
  vi.resetModules();
});

function makeRequest(headers: Record<string, string | undefined> = {}, extras: Record<string, unknown> = {}) {
  return {
    headers,
    method: "GET",
    path: "/health",
    ip: "127.0.0.1",
    ...extras,
  } as any;
}

function makeResponse(statusCode = 200) {
  const res = new EventEmitter() as any;
  res.statusCode = statusCode;
  res.headers = {} as Record<string, string>;
  res.setHeader = vi.fn((name: string, value: string) => {
    res.headers[name] = value;
    return res;
  });
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  res.cookie = vi.fn(() => res);
  res.redirect = vi.fn(() => res);
  return res;
}

async function withTempStorage<T>(run: (storage: typeof import("../../apps/api/src/infrastructure/storage/index")) => Promise<T> | T): Promise<T> {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "wathiqly-storage-"));
  const previousCwd = process.cwd();
  process.chdir(tempDir);
  try {
    vi.resetModules();
    const storage = await import("../../apps/api/src/infrastructure/storage/index");
    return await run(storage);
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.resetModules();
  }
}

async function checkCors(origin?: string) {
  return await new Promise<{ err: Error | null; allow?: boolean }>((resolve) => {
    corsOptions.origin(origin as any, (err, allow) => resolve({ err, allow }));
  });
}

describe("shared platform and source-of-truth contracts", () => {
  it.each([
    ["platform name", PLATFORM_NAME, "Wathiqly"],
    ["platform version", PLATFORM_VERSION, "v10.0"],
    ["runtime api entry", PLATFORM_RUNTIME.apiEntry, "apps/api/src/runtime/index.ts"],
    ["runtime api prefix", PLATFORM_RUNTIME.defaultApiPrefix, "/api"],
    ["session cookie name", PLATFORM_POLICY.sessionCookieName, "wathiqly_session"],
    ["cookie alias", COOKIE_NAME, PLATFORM_POLICY.sessionCookieName],
    ["auth required message", UNAUTHED_ERR_MSG, PLATFORM_POLICY.authRequiredMessage],
    ["admin required message", NOT_ADMIN_ERR_MSG, PLATFORM_POLICY.adminRequiredMessage],
    ["source-of-truth runtime reference", SOURCE_OF_TRUTH.runtime, PLATFORM_RUNTIME],
    ["source-of-truth policy reference", SOURCE_OF_TRUTH.policy, PLATFORM_POLICY],
    ["source-of-truth theme key", SOURCE_OF_TRUTH.themeStorageKey, THEME_STORAGE_KEY],
    ["shared index re-exports platform name", sharedIndex.PLATFORM_NAME, PLATFORM_NAME],
    ["shared index re-exports platform version", sharedIndex.PLATFORM_VERSION, PLATFORM_VERSION],
  ])("%s", (_label, actual, expected) => {
    expect(actual).toBe(expected);
  });

  it.each([
    ["uuid shape from createUuid", createUuid()],
    ["uuid shape from createCorrelationId", createCorrelationId()],
    ["request id with default prefix", createRequestId()],
    ["request id with custom prefix", createRequestId("trace")],
  ])("%s", (_label, value) => {
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(6);
  });

  it("request ids keep their prefix", () => {
    expect(createRequestId("req").startsWith("req_")).toBe(true);
    expect(createRequestId("trace").startsWith("trace_")).toBe(true);
  });
});

describe("token extraction, signing, verification, and session resolution", () => {
  it.each([
    ["Bearer abc.def.ghi", "abc.def.ghi"],
    ["Bearer   token123   ", "token123"],
  ])("extractBearerToken parses %s", (header, expected) => {
    expect(extractBearerToken(makeRequest({ authorization: header }))).toBe(expected);
  });

  it.each([
    [undefined],
    ["Basic abc"],
    ["Bearer   "],
  ])("extractBearerToken rejects malformed header %s", (header) => {
    expect(extractBearerToken(makeRequest({ authorization: header }))).toBeNull();
  });

  it("extractSessionToken reads the configured cookie", () => {
    const cookieHeader = `${PLATFORM_POLICY.sessionCookieName}=session-token; other=value`;
    expect(extractSessionToken(makeRequest({ cookie: cookieHeader }))).toBe("session-token");
  });

  it("extractSessionToken returns null when cookie is absent", () => {
    expect(extractSessionToken(makeRequest())).toBeNull();
  });

  it("extractDevelopmentIdentity works in development mode", () => {
    process.env.NODE_ENV = "development";
    const identity = extractDevelopmentIdentity(makeRequest({ "x-user-id": "42", "x-user-role": "admin" }));
    expect(identity).toEqual({ id: 42, role: "admin", source: "development-header" });
  });

  it("extractDevelopmentIdentity is disabled in production", () => {
    process.env.NODE_ENV = "production";
    expect(extractDevelopmentIdentity(makeRequest({ "x-user-id": "42", "x-user-role": "admin" }))).toBeNull();
  });

  it.each([
    [0, "JWT payload requires a valid numeric id"],
    [-1, "JWT payload requires a valid numeric id"],
    [1.2, "JWT payload requires a valid numeric id"],
  ])("signJWT rejects invalid id %s", async (id, message) => {
    await expect(signJWT({ id: id as number })).rejects.toThrow(message);
  });

  it("signJWT and verifyJWT round-trip an admin payload", async () => {
    const token = await signJWT({ id: 7, role: "admin" });
    const payload = await verifyJWT(token);
    expect(payload?.id).toBe(7);
    expect(payload?.role).toBe("admin");
    expect(payload?.type).toBe("session");
  });

  it("signJWT and verifyJWT round-trip a user payload", async () => {
    const token = await signJWT({ id: 19, role: "user" });
    const payload = await verifyJWT(token);
    expect(payload?.id).toBe(19);
    expect(payload?.role).toBe("user");
  });

  it.each([
    ["not-a-jwt"],
    ["a.b"],
    [""],
  ])("verifyJWT rejects malformed token %s", async (token) => {
    await expect(verifyJWT(token)).resolves.toBeNull();
  });

  it("verifyJWT rejects tampered tokens", async () => {
    const token = await signJWT({ id: 55, role: "user" });
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    await expect(verifyJWT(tampered)).resolves.toBeNull();
  });

  it("verifyJWT rejects non-session token types", async () => {
    const token = await signJWT({ id: 99, role: "user", type: "refresh" as any });
    await expect(verifyJWT(token)).resolves.toBeNull();
  });

  it("resolveUserFromRequest prefers bearer tokens over cookies", async () => {
    const bearer = await signJWT({ id: 101, role: "admin" });
    const cookie = await signJWT({ id: 202, role: "user" });
    const user = await resolveUserFromRequest(makeRequest({ authorization: `Bearer ${bearer}`, cookie: `${PLATFORM_POLICY.sessionCookieName}=${cookie}` }));
    expect(user?.id).toBe(101);
    expect(user?.role).toBe("admin");
  });

  it("resolveUserFromRequest falls back to cookie tokens", async () => {
    const cookie = await signJWT({ id: 303, role: "user" });
    const user = await resolveUserFromRequest(makeRequest({ cookie: `${PLATFORM_POLICY.sessionCookieName}=${cookie}` }));
    expect(user?.id).toBe(303);
    expect(user?.role).toBe("user");
  });

  it("resolveUserFromRequest falls back to development headers", async () => {
    process.env.NODE_ENV = "development";
    const user = await resolveUserFromRequest(makeRequest({ "x-user-id": "404", "x-user-role": "admin" }));
    expect(user?.id).toBe(404);
    expect(user?.role).toBe("admin");
  });

  it("authGuard accepts a signed bearer session", async () => {
    const token = await signJWT({ id: 7, role: "user" });
    const req = makeRequest({ authorization: `Bearer ${token}` });
    const res = makeResponse();
    const next = vi.fn();
    await authGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 7, role: "user" });
  });

  it("authGuard rejects unauthenticated requests", async () => {
    process.env.NODE_ENV = "production";
    const req = makeRequest();
    const res = makeResponse();
    const next = vi.fn();
    await authGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("adminGuard accepts admin sessions", async () => {
    const token = await signJWT({ id: 9, role: "admin" });
    const req = makeRequest({ authorization: `Bearer ${token}` });
    const res = makeResponse();
    const next = vi.fn();
    await adminGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 9, role: "admin" });
  });

  it("adminGuard rejects non-admin users", async () => {
    const token = await signJWT({ id: 11, role: "user" });
    const req = makeRequest({ authorization: `Bearer ${token}` });
    const res = makeResponse();
    const next = vi.fn();
    await adminGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("policy enforcement and validation helpers", () => {
  it.each([
    ["assertAuthenticated allows a user", () => assertAuthenticated({ id: 1, role: "user" })],
    ["assertAuthenticated rejects missing user", () => expect(() => assertAuthenticated(null as any)).toThrow(UNAUTHED_ERR_MSG)],
    ["assertAdmin allows admins", () => assertAdmin({ id: 1, role: "admin" })],
    ["assertAdmin rejects regular users", () => expect(() => assertAdmin({ id: 1, role: "user" })).toThrow(NOT_ADMIN_ERR_MSG)],
    ["assertOwnerOrAdmin allows owners", () => assertOwnerOrAdmin({ id: 7, role: "user" }, 7)],
    ["assertOwnerOrAdmin allows admins", () => assertOwnerOrAdmin({ id: 7, role: "admin" }, 99)],
    ["assertOwnerOrAdmin rejects strangers", () => expect(() => assertOwnerOrAdmin({ id: 7, role: "user" }, 99)).toThrow("You are not authorized to access this resource")],
    ["assertParticipantOrAdmin allows participants", () => assertParticipantOrAdmin({ id: 3, role: "user" }, [1, 3, 9])],
    ["assertParticipantOrAdmin allows admins", () => assertParticipantOrAdmin({ id: 3, role: "admin" }, [1, 9])],
    ["assertParticipantOrAdmin rejects outsiders", () => expect(() => assertParticipantOrAdmin({ id: 3, role: "user" }, [1, 9])).toThrow("You are not authorized to access this resource")],
    ["AccessControl.ensureOwnership works", () => AccessControl.ensureOwnership(5, 5)],
    ["AccessControl.ensureRole works", () => AccessControl.ensureRole("admin", "admin")],
  ])("%s", (_label, fn) => {
    fn();
  });

  it.each([
    ["internal storage prefix", `${PLATFORM_POLICY.trustedUploadPrefix}proof.png`, `${PLATFORM_POLICY.trustedUploadPrefix}proof.png`],
  ])("assertTrustedUploadUrl allows %s", (_label, url, expected) => {
    expect(assertTrustedUploadUrl(url)).toBe(expected);
  });

  it("assertTrustedUploadUrl allows allowed HTTPS hosts", () => {
    process.env.ALLOWED_UPLOAD_HOSTS = "files.example.com,cdn.example.com";
    const url = assertTrustedUploadUrl("https://files.example.com/path/report.pdf");
    expect(url).toBe("https://files.example.com/path/report.pdf");
  });

  it("assertTrustedUploadUrl rejects insecure schemes", () => {
    expect(() => assertTrustedUploadUrl("http://files.example.com/path/report.pdf")).toThrow("Untrusted fileUrl");
  });

  it("assertTrustedUploadUrl rejects unapproved hosts", () => {
    process.env.ALLOWED_UPLOAD_HOSTS = "files.example.com";
    expect(() => assertTrustedUploadUrl("https://evil.example.com/path/report.pdf")).toThrow("Untrusted fileUrl");
  });

  it.each([
    ["12.5000", 12.5],
    ["1", 1],
  ])("assertPositiveAmount accepts %s", (value, expected) => {
    expect(assertPositiveAmount(value)).toBe(expected);
  });

  it.each([
    ["0"],
    ["-1"],
    ["abc"],
  ])("assertPositiveAmount rejects invalid amount %s", (value) => {
    expect(() => assertPositiveAmount(value)).toThrow("amount must be a positive number");
  });

  it("validate middleware accepts parsed input", () => {
    const req = { body: { amount: " 12 " } } as any;
    const res = makeResponse();
    const next = vi.fn();
    const schema = {
      parse: (input: unknown) => ({ amount: Number((input as any).amount.trim()) }),
    };
    validate(schema)(req, res, next);
    expect(req.body).toEqual({ amount: 12 });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("validate middleware returns structured errors", () => {
    const req = { body: { amount: "bad" } } as any;
    const res = makeResponse();
    const next = vi.fn();
    const schema = { parse: () => { throw new Error("invalid payload"); } };
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation failed" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("sanitize removes markup and quotes", () => {
    expect(sanitize("  <tag>\"hello\"'  " )).toBe("taghello");
  });

  it("sanitize normalizes non-string inputs", () => {
    expect(sanitize(123 as any)).toBe("123");
  });

  it("sanitizeHtml is identity on the server and sanitizeObject preserves nested structure", () => {
    const input = {
      title: "<b>Title</b>",
      items: ["<i>Alpha</i>", { note: "<script>alert(1)</script>" }],
    };
    expect(sanitizeHtml("<b>hello</b>")).toBe("<b>hello</b>");
    expect(sanitizeObject(input)).toEqual(input);
  });
});

describe("CORS, headers, logging, storage, and telemetry", () => {
  it("securityHeadersMiddleware sets the hardening headers", () => {
    const req = makeRequest();
    const res = makeResponse();
    const next = vi.fn();
    securityHeadersMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("Cross-Origin-Opener-Policy", "same-origin");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    [undefined, true],
    ["http://localhost:3000", true],
  ])("corsOptions allows %s", async (origin, expected) => {
    process.env.NODE_ENV = "development";
    const result = await checkCors(origin as string | undefined);
    expect(result.err).toBeNull();
    expect(result.allow).toBe(expected);
  });

  it("corsOptions rejects a disallowed origin", async () => {
    const result = await checkCors("https://evil.example.com");
    expect(result.err).toBeInstanceOf(Error);
    expect(result.allow).toBeUndefined();
  });

  it("Logger methods forward to the console with labels", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    Logger.info("hello", { a: 1 });
    Logger.warn("careful", { b: 2 });
    Logger.error("boom", new Error("x"), { c: 3 });
    Logger.debug("trace", { d: 4 });
    expect(info).toHaveBeenCalledWith("[INFO] hello", { a: 1 });
    expect(warn).toHaveBeenCalledWith("[WARN] careful", { b: 2 });
    expect(error).toHaveBeenCalled();
    expect(debug).toHaveBeenCalledWith("[DEBUG] trace", { d: 4 });
  });

  it("storagePut writes a file and checksum metadata", async () => {
    await withTempStorage(async (storage) => {
      const data = Buffer.from("secure payload", "utf8");
      const result = await storage.storagePut("docs/report.pdf", data, "application/pdf");
      expect(result.key).toBe("docs/report.pdf");
      expect(result.url).toBe("/uploads/docs/report.pdf");

      const filePath = path.join(process.cwd(), "uploads", "docs", "report.pdf");
      const metaPath = `${filePath}.meta.json`;
      expect(readFileSync(filePath, "utf8")).toBe("secure payload");
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      expect(meta.contentType).toBe("application/pdf");
      expect(meta.checksum).toBe(createHash("sha256").update(data).digest("hex"));
    });
  });

  it("storagePut rejects traversal attempts", async () => {
    await withTempStorage(async (storage) => {
      await expect(storage.storagePut("../escape.txt", Buffer.from("x"))).rejects.toThrow("Invalid storage key");
    });
  });

  it("request telemetry logs successful requests as info", () => {
    const info = vi.spyOn(Logger, "info").mockImplementation(() => undefined);
    const middleware = createRequestTelemetryMiddleware();
    const req = makeRequest({ "x-correlation-id": "abc" }, { path: "/health", method: "GET", route: { path: "/health" } });
    const res = makeResponse(200);
    middleware(req, res, vi.fn());
    res.emit("finish");
    expect(res.setHeader).toHaveBeenCalledWith("x-correlation-id", "abc");
    expect(info).toHaveBeenCalled();
  });

  it("request telemetry logs sensitive client errors as warnings", () => {
    const warn = vi.spyOn(Logger, "warn").mockImplementation(() => undefined);
    const middleware = createRequestTelemetryMiddleware();
    const req = makeRequest({}, { path: "/api/upload", method: "POST" });
    const res = makeResponse(404);
    middleware(req, res, vi.fn());
    res.emit("finish");
    expect(warn).toHaveBeenCalled();
  });

  it("request telemetry logs server errors as errors", () => {
    const error = vi.spyOn(Logger, "error").mockImplementation(() => undefined);
    const middleware = createRequestTelemetryMiddleware();
    const req = makeRequest({}, { path: "/api/trpc", method: "POST" });
    const res = makeResponse(500);
    middleware(req, res, vi.fn());
    res.emit("finish");
    expect(error).toHaveBeenCalled();
  });
});

describe("encryption, rules, services, schemas, and routers", () => {
  it("encryptData and decryptData round-trip securely", () => {
    const plain = JSON.stringify({ latitude: 1, longitude: 2 });
    const encrypted = encryptData(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptData(encrypted)).toBe(plain);
  });

  it("decryptData returns original input when the payload is invalid", () => {
    expect(decryptData("not-base64url")).toBe("not-base64url");
  });

  it("rulesEngine matches deterministic eq and gt rules", () => {
    rulesEngine.setRules([
      { field: "status", operator: "eq", value: "active" },
      { field: "amount", operator: "gt", value: 100 },
    ]);
    const matches = rulesEngine.getMatchingRules({ status: "active", amount: 150 });
    expect(matches).toHaveLength(2);
    expect(evaluateRules({ status: "active", amount: 150 })).toHaveLength(2);
  });

  it("rulesEngine clear removes all rules", () => {
    rulesEngine.addRule({ field: "status", operator: "eq", value: "active" });
    expect(rulesEngine.getMatchingRules({ status: "active" })).toHaveLength(1);
    rulesEngine.clear();
    expect(rulesEngine.getMatchingRules({ status: "active" })).toHaveLength(0);
  });

  it("PaymentService transitions awaiting payment orders to paid", () => {
    const service = new PaymentService();
    const result = service.processPayment({ id: "o1", amount: "99.50", currency: "USD", status: "AWAITING_PAYMENT", updatedAt: new Date("2025-01-01T00:00:00Z") });
    expect(result.order.status).toBe("PAID");
    expect(result.payment.status).toBe("SUCCESS");
  });

  it("PaymentService rejects invalid order states", () => {
    const service = new PaymentService();
    expect(() => service.processPayment({ id: "o2", amount: "99.50", currency: "USD", status: "PAID", updatedAt: new Date() })).toThrow("Order is not ready for payment");
  });

  it("InspectionService approves orders under inspection", () => {
    const service = new InspectionService();
    const result = service.processInspection({ id: "o3", status: "UNDER_INSPECTION", updatedAt: new Date("2025-01-01T00:00:00Z") });
    expect(result.order.status).toBe("APPROVED");
    expect(result.inspection.orderId).toBe("o3");
  });

  it("InspectionService rejects orders in the wrong state", () => {
    const service = new InspectionService();
    expect(() => service.processInspection({ id: "o4", status: "APPROVED", updatedAt: new Date() })).toThrow("Order is not under inspection");
  });

  it("ShipmentService ships awaiting shipment orders", () => {
    const service = new ShipmentService();
    const result = service.processShipment({ id: "o5", status: "AWAITING_SHIPMENT", updatedAt: new Date("2025-01-01T00:00:00Z") });
    expect(result.order.status).toBe("SHIPPED");
    expect(result.shipment.orderId).toBe("o5");
  });

  it("ShipmentService rejects invalid shipment states", () => {
    const service = new ShipmentService();
    expect(() => service.processShipment({ id: "o6", status: "DELIVERED", updatedAt: new Date() })).toThrow("Order is not ready for shipment");
  });

  it("schema exports expose the expected table columns", () => {
    expect(users.id.name).toBe("id");
    expect(users.openId.name).toBe("openId");
    expect(wallets.balance.name).toBe("balance");
    expect(escrows.buyerId.name).toBe("buyerId");
    expect(chatConversations.id.name).toBe("id");
    expect(chatMessages.message.name).toBe("message");
    expect(auditLogs.correlationId.name).toBe("correlationId");
  });

  it("databaseSchema is the same source-of-truth object as schema", () => {
    expect(databaseSchema).toBe(schema);
    expect(databaseSchema.users).toBe(users);
  });

  it("ledger schema exports define the accounting tables", () => {
    expect(ledgerAccounts.id.name).toBe("id");
    expect(ledgerTransactions.idempotencyKey.name).toBe("idempotencyKey");
    expect(ledgerEntries.balanceAfter.name).toBe("balanceAfter");
    expect(accountBalancesCache.accountId.name).toBe("accountId");
  });

  it("outbox and saga schema exports remain available", () => {
    expect(outboxEvents.eventId.name).toBe("eventId");
    expect(idempotencyRecords.idempotencyKey.name).toBe("idempotencyKey");
    expect(sagaStates.sagaId.name).toBe("sagaId");
  });

  it("systemRouter exposes the expected public and admin procedures", () => {
    const keys = Object.keys((systemRouter as any)._def.record);
    expect(keys).toEqual(expect.arrayContaining(["health", "notifyOwner"]));
  });

  it("appRouter exposes the platform router namespaces", () => {
    const keys = Object.keys((appRouter as any)._def.record);
    expect(keys).toEqual(expect.arrayContaining(["auth", "behavioral", "chat", "admin", "diaas", "disputeCollateral", "escrow", "inspectionService", "mediator", "mediatorAdmin", "products", "smartEscrow", "system", "timedLinks", "trust", "user", "verify", "wallet", "walletId"]));
  });
});
