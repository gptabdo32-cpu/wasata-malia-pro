/**
 * Canonical API runtime entrypoint.
 * Boots the server through the modern runtime layer.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { nanoid } from "nanoid";
import { appRouter } from "../interface/api/routers";
import { createContext } from "../interface/trpc/context";
import { createRequestTelemetryMiddleware } from "../infrastructure/observability/http";
import { generalLimiter, authLimiter, helmetConfig, mongoSanitizeMiddleware, xssCleanMiddleware, hppMiddleware, securityHeadersMiddleware, corsOptions, authGuard, verifyJWT } from "../infrastructure/security";
import { startMetricsServer, Logger } from "../infrastructure/observability";
import { storagePut } from "../infrastructure/storage";
import { initializeSubscribers } from "../infrastructure/events";
import { OutboxWorker } from "../infrastructure/outbox";
import { ENV as ConfigEnv } from "../infrastructure/config/env";
import { closeDb, getDb } from "../infrastructure/db";
import { CacheManager } from "../infrastructure/cache/CacheManager";
import { PLATFORM_POLICY } from "@shared/platform";

let activeServer: ReturnType<typeof createServer> | null = null;
let activeOutboxWorker: OutboxWorker | null = null;
let shuttingDown = false;

const STATIC_DIR = path.join(process.cwd(), "dist", "public");
const STATIC_INDEX = path.join(STATIC_DIR, "index.html");

async function shutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    Logger.info(`Shutting down server (${reason})`);
    activeOutboxWorker?.stop();
    activeOutboxWorker = null;
    await CacheManager.close();
    await closeDb();
  } catch (error) {
    Logger.error("Error while closing runtime resources", error);
  }

  if (!activeServer) return;
  await new Promise<void>((resolve) => {
    activeServer?.close(() => resolve());
  });
}

process.once("SIGINT", () => { void shutdown("SIGINT").finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void shutdown("SIGTERM").finally(() => process.exit(0)); });
process.once("unhandledRejection", (error) => { Logger.error("Unhandled promise rejection", error); });
process.once("uncaughtException", (error) => { Logger.error("Uncaught exception", error); void shutdown("uncaughtException").finally(() => process.exit(1)); });

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3000): Promise<number> {
  if (ConfigEnv.isProduction) {
    if (!(await isPortAvailable(startPort))) {
      throw new Error(`Port ${startPort} is already in use in production.`);
    }
    return startPort;
  }

  for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port;
  throw new Error(`No available port found starting from ${startPort}`);
}

const INTERNAL_REDIRECT_ALLOWLIST = new Set([
  "/",
  "/dashboard",
  "/products",
  "/profile",
  "/wallet",
  "/wallet-id",
  "/messaging",
  "/admin",
  "/create-transaction",
  "/verify",
  "/business",
  "/trusted-seller",
  "/transactions",
  "/withdraw",
]);

function sanitizeInternalRedirect(target: string) {
  const raw = String(target ?? "").trim();
  if (!raw) return "/";

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || decoded.includes("\r") || decoded.includes("\n")) {
    return "/";
  }

  const [pathname] = decoded.split("?");
  if (!INTERNAL_REDIRECT_ALLOWLIST.has(pathname)) {
    return "/";
  }

  return decoded;
}

async function startServer() {
  initializeSubscribers();
  activeOutboxWorker = new OutboxWorker();
  activeOutboxWorker.start();
  startMetricsServer();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  const server = createServer(app);
  activeServer = server;

  app.use(helmetConfig);
  app.use(mongoSanitizeMiddleware);
  app.use(xssCleanMiddleware);
  app.use(hppMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(createRequestTelemetryMiddleware());
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", mode: "live", timestamp: new Date().toISOString() }));
  app.get("/ready", async (_req, res) => {
    try {
      await getDb();
      const cacheHealthy = await CacheManager.ping();
      res.status(200).json({
        status: cacheHealthy ? "ready" : "degraded",
        workerRunning: Boolean(activeOutboxWorker),
        cacheHealthy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({ status: "not_ready", workerRunning: Boolean(activeOutboxWorker), cacheHealthy: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  app.post("/api/upload", authLimiter, generalLimiter, authGuard, multer({ storage: multer.memoryStorage(), limits: { fileSize: ConfigEnv.maxUploadSizeMB * 1024 * 1024 } }).single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      if (!detectedType || !ConfigEnv.allowedUploadMimeTypes.includes(detectedType.mime)) {
        return res.status(400).json({ error: "Unsupported file type" });
      }
      if (req.file.mimetype && req.file.mimetype !== detectedType.mime) {
        return res.status(400).json({ error: "File type mismatch" });
      }
      const detectedMime = detectedType.mime;
      const safeExt = detectedType.ext || (detectedMime.split("/")[1] || "bin");
      const filename = `liveness/${Date.now()}-${nanoid()}.${safeExt}`;
      const uploadResult = await storagePut(filename, req.file.buffer, detectedMime);
      res.json({ success: true, url: uploadResult.url, key: uploadResult.key });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/oauth/callback", authLimiter, async (req, res) => {
    const rawToken = (req.query.token ?? req.query.access_token ?? req.query.session ?? "").toString().trim();
    const redirectTo = sanitizeInternalRedirect((req.query.redirectTo ?? "/").toString());
    if (!rawToken) {
      return res.status(400).json({ error: "Missing authentication token" });
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Referrer-Policy", "no-referrer");

    const payload = await verifyJWT(rawToken);
    if (!payload?.id) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    res.cookie(PLATFORM_POLICY.sessionCookieName, rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: ConfigEnv.isProduction,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.redirect(redirectTo.startsWith("/") ? redirectTo : "/");
  });
  app.use("/api/trpc", generalLimiter, createExpressMiddleware({ router: appRouter, createContext }));

  if (fs.existsSync(STATIC_INDEX)) {
    app.use(express.static(STATIC_DIR));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(STATIC_INDEX);
    });
    Logger.info(`Static frontend enabled from ${STATIC_DIR}`);
  } else if (!ConfigEnv.isProduction) {
    Logger.info("Development mode detected; Vite integration omitted in this clean build.");
  }

  const preferredPort = ConfigEnv.port;
  const port = await findAvailablePort(preferredPort);
  server.listen(port, () => Logger.info(`Server running on http://localhost:${port}/`));
}

startServer().catch((error) => {
  Logger.error("Server failed to start", error);
  void closeDb().catch(() => undefined);
  process.exitCode = 1;
});
export const runtime = { entry: "apps/api/src/runtime/index.ts", mode: "server" } as const;
