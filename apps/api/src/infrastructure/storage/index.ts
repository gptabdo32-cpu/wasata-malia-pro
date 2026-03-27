import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ENV } from "../config/env";

export type StoragePutResult = {
  key: string;
  url: string;
};

function getStorageRoot() {
  return path.resolve(ENV.uploadsDir);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function normalizeStorageKey(key: string): string {
  const cleaned = key.replace(/\\/g, "/").trim();
  if (!cleaned) throw new Error("Storage key is required");
  if (cleaned.startsWith("/") || cleaned.includes("..")) {
    throw new Error("Invalid storage key");
  }
  const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}

export async function storagePut(
  key: string,
  data: Buffer | Uint8Array,
  contentType = "application/octet-stream"
): Promise<StoragePutResult> {
  const safeKey = normalizeStorageKey(key);
  const storageRoot = getStorageRoot();
  const target = path.resolve(storageRoot, safeKey);
  const relative = path.relative(storageRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Storage target escaped the uploads directory");
  }

  await ensureDir(path.dirname(target));
  await fs.writeFile(target, data);

  // Persist a small sidecar metadata file for traceability.
  const metaPath = `${target}.meta.json`;
  await fs.writeFile(
    metaPath,
    JSON.stringify(
      {
        contentType,
        storedAt: new Date().toISOString(),
        checksum: crypto.createHash("sha256").update(data).digest("hex"),
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    key: safeKey,
    url: `/uploads/${safeKey.replace(/\\/g, "/")}`,
  };
}
