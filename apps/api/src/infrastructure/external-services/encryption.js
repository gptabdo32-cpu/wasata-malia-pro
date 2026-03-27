import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;

function readRuntimeSecret() {
  const runtimeEnv = globalThis.__WATHIQLY_ENV__ || {};
  return runtimeEnv.encryptionKey || runtimeEnv.serverSecret || runtimeEnv.jwtSecret || "dev-encryption-key";
}

function deriveKey() {
  const secret = readRuntimeSecret();
  return crypto.createHash("sha256").update(String(secret)).digest().subarray(0, KEY_BYTES);
}

export function encryptData(value) {
  const plaintext = Buffer.from(String(value), "utf8");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptData(value) {
  try {
    const payload = Buffer.from(String(value), "base64url");
    if (payload.length < 28) return String(value);
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, deriveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return String(value);
  }
}
