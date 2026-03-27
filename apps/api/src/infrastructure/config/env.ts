import crypto from "node:crypto";
import path from "node:path";
import { PLATFORM_POLICY } from "@shared/platform";

const isProduction = process.env.NODE_ENV === "production";

const REQUIRED_PRODUCTION_ENV_VARS = [
  "DATABASE_URL",
  "OAUTH_SERVER_URL",
  "VITE_APP_ID",
  "JWT_SECRET",
  "SERVER_SECRET",
  "ENCRYPTION_KEY",
  "COOKIE_SECRET",
  "CORS_ORIGINS",
] as const;

function ephemeralSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function readEnv(name: string, options: { required?: boolean; defaultValue?: string } = {}) {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isProduction && options.required) {
    throw new Error(`Critical Environment Variable Missing: ${name}`);
  }
  if (options.defaultValue !== undefined) return options.defaultValue;
  return "";
}

function readCsvEnv(name: string, fallback: string[]) {
  const raw = process.env[name]?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  return Array.from(new Set(raw.length ? raw : fallback));
}

function secretOrEphemeral(name: string, bytes = 32) {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isProduction) {
    throw new Error(`Critical Environment Variable Missing: ${name}`);
  }
  return ephemeralSecret(bytes);
}

const allowedUploadMimeTypes = readCsvEnv("ALLOWED_UPLOAD_MIME_TYPES", [...PLATFORM_POLICY.allowedUploadMimeTypes]);

const parsedMaxUploadSize = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || String(PLATFORM_POLICY.maxUploadSizeMb), 10);
const parsedChainId = process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined;
const parsedPort = Number.parseInt(process.env.PORT || "3000", 10);
const parsedDbConnectionLimit = Number.parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10);
const defaultUploadsDir = path.resolve(process.cwd(), "uploads");

export const ENV = {
  appId: readEnv("VITE_APP_ID", { required: true, defaultValue: "default_app_id" }),
  databaseUrl: readEnv("DATABASE_URL", { required: true }),
  oAuthServerUrl: readEnv("OAUTH_SERVER_URL", { required: true }),
  ownerOpenId: readEnv("OWNER_OPEN_ID"),
  forgeApiUrl: readEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: readEnv("BUILT_IN_FORGE_API_KEY"),
  polygonRpcUrl: readEnv("POLYGON_RPC_URL"),
  smartEscrowContractAddress: readEnv("SMART_ESCROW_CONTRACT_ADDRESS"),
  blockchainPrivateKey: readEnv("BLOCKCHAIN_PRIVATE_KEY"),
  chainId: Number.isInteger(parsedChainId) ? parsedChainId : undefined,
  corsOrigins: readEnv("CORS_ORIGINS", { defaultValue: isProduction ? "" : "http://localhost:3000,http://localhost:4173" }),
  redisUrl: readEnv("REDIS_URL", { defaultValue: isProduction ? "redis://redis:6379" : "redis://127.0.0.1:6379" }),
  allowedUploadHosts: readCsvEnv("ALLOWED_UPLOAD_HOSTS", []),
  uploadsDir: readEnv("UPLOADS_DIR", { defaultValue: defaultUploadsDir }),
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000,
  dbConnectionLimit: Number.isInteger(parsedDbConnectionLimit) && parsedDbConnectionLimit > 0 ? parsedDbConnectionLimit : 10,
  maxUploadSizeMB: Number.isFinite(parsedMaxUploadSize) && parsedMaxUploadSize > 0 ? parsedMaxUploadSize : PLATFORM_POLICY.maxUploadSizeMb,
  allowedUploadMimeTypes,
  cookieSecret: secretOrEphemeral("COOKIE_SECRET"),
  jwtSecret: secretOrEphemeral("JWT_SECRET"),
  serverSecret: secretOrEphemeral("SERVER_SECRET"),
  encryptionKey: secretOrEphemeral("ENCRYPTION_KEY", 32),
  isProduction,
  allowDevelopmentIdentityHeaders: process.env.ALLOW_DEV_IDENTITY_HEADERS === "true" && !isProduction,
} as const;

if (isProduction) {
  const missing = REQUIRED_PRODUCTION_ENV_VARS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Critical Security Error: missing production environment variables: ${missing.join(", ")}`);
  }

  if (!process.env.CORS_ORIGINS?.trim()) {
    throw new Error("Critical Security Error: CORS_ORIGINS must be set in production.");
  }
}

;(globalThis as typeof globalThis & { __WATHIQLY_ENV__?: typeof ENV }).__WATHIQLY_ENV__ = ENV;
