import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { ENV } from "../config/env";

export type LockBackend = "redis" | "file";

type LockRecord = {
  resource: string;
  token: string;
  expiresAt: number;
  createdAt: number;
  pid: number;
};

const lockDir = path.join(os.tmpdir(), "wathiqly-locks");
const redisUrl = ENV.redisUrl?.trim();
let ensureDirPromise: Promise<void> | null = null;
let redisClient: any = null;
let redisClientReady: Promise<any | null> | null = null;

function now() {
  return Date.now();
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.max(1, ms)));
}

async function ensureLockDir() {
  if (!ensureDirPromise) {
    ensureDirPromise = fs.mkdir(lockDir, { recursive: true }).then(() => undefined);
  }
  await ensureDirPromise;
}

function lockFilePath(resource: string) {
  const digest = crypto.createHash("sha256").update(resource).digest("hex");
  return path.join(lockDir, `${digest}.lock`);
}

async function readFileLock(resource: string): Promise<LockRecord | null> {
  try {
    const raw = await fs.readFile(lockFilePath(resource), "utf8");
    const parsed = JSON.parse(raw) as Partial<LockRecord>;
    if (!parsed.token || typeof parsed.expiresAt !== "number") return null;
    return {
      resource,
      token: String(parsed.token),
      expiresAt: parsed.expiresAt,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : now(),
      pid: typeof parsed.pid === "number" ? parsed.pid : 0,
    };
  } catch {
    return null;
  }
}

async function writeFileLock(resource: string, record: LockRecord) {
  await ensureLockDir();
  const filePath = lockFilePath(resource);
  const tempPath = `${filePath}.${record.token}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, filePath);
}

async function clearFileLock(resource: string, token: string) {
  const existing = await readFileLock(resource);
  if (!existing || existing.token !== token) return false;
  try {
    await fs.unlink(lockFilePath(resource));
  } catch {
    // Ignore races where another cleaner already removed the file.
  }
  return true;
}

async function clearExpiredFileLock(resource: string) {
  const existing = await readFileLock(resource);
  if (!existing) return false;
  if (existing.expiresAt > now()) return false;
  try {
    await fs.unlink(lockFilePath(resource));
  } catch {
    // Best effort.
  }
  return true;
}

async function getRedisClient(): Promise<any | null> {
  if (!redisUrl) return null;
  if (redisClient?.status === "ready") return redisClient;
  if (!redisClientReady) {
    redisClientReady = (async () => {
      try {
        const mod = await import("ioredis");
        const RedisCtor = (mod.default ?? mod) as unknown as new (url: string, options: Record<string, unknown>) => any;
        if (!redisClient) {
          redisClient = new RedisCtor(redisUrl, {
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
          });
        }
        if (redisClient.status !== "ready") {
          await redisClient.connect();
        }
        return redisClient;
      } catch {
        try {
          await redisClient?.quit();
        } catch {
          // ignore
        }
        redisClient = null;
        return null;
      }
    })();
  }
  const client = await redisClientReady;
  if (!client || client.status !== "ready") {
    redisClientReady = null;
    return null;
  }
  return client;
}

async function acquireRedisLock(resource: string, token: string, ttlMs: number, timeoutMs: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  const key = `lock:${resource}`;
  const startedAt = now();
  while (now() - startedAt <= timeoutMs) {
    try {
      const ok = await client.set(key, token, "PX", ttlMs, "NX");
      if (ok === "OK") return true;
    } catch {
      return false;
    }
    await sleep(Math.min(150, Math.max(25, Math.ceil(ttlMs / 10))));
  }
  return false;
}

async function releaseRedisLock(resource: string, token: string) {
  const client = await getRedisClient();
  if (!client) return false;

  const key = `lock:${resource}`;
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end
    return 0
  `;
  const result = await client.eval(script, 1, key, token);
  return Number(result ?? 0) > 0;
}

async function renewRedisLock(resource: string, token: string, ttlMs: number) {
  const client = await getRedisClient();
  if (!client) return false;

  const key = `lock:${resource}`;
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    end
    return 0
  `;
  const result = await client.eval(script, 1, key, token, String(ttlMs));
  return Number(result ?? 0) > 0;
}

export class DistributedLock {
  private token: string | null = null;
  private backend: LockBackend | null = null;

  constructor(public readonly resource = "default", public readonly ttlMs = 30_000) {}

  async acquire(timeoutMs = this.ttlMs): Promise<boolean> {
    if (this.token) return true;

    const token = crypto.randomUUID();

    if (await acquireRedisLock(this.resource, token, this.ttlMs, timeoutMs)) {
      this.token = token;
      this.backend = "redis";
      return true;
    }

    const deadline = now() + Math.max(0, timeoutMs);
    let attempt = 0;
    while (now() <= deadline) {
      const acquiredAt = now();
      await ensureLockDir();
      await clearExpiredFileLock(this.resource);
      try {
        const record: LockRecord = {
          resource: this.resource,
          token,
          expiresAt: acquiredAt + this.ttlMs,
          createdAt: acquiredAt,
          pid: process.pid,
        };
        const filePath = lockFilePath(this.resource);
        const handle = await fs.open(filePath, "wx", 0o600);
        try {
          await handle.writeFile(`${JSON.stringify(record)}\n`);
        } finally {
          await handle.close();
        }
        this.token = token;
        this.backend = "file";
        return true;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException)?.code;
        if (code !== "EEXIST") {
          await sleep(Math.min(150, 20 + attempt * 15));
        } else {
          await sleep(Math.min(150, 25 + attempt * 20));
        }
      }
      attempt += 1;
    }

    return false;
  }

  async release(): Promise<boolean> {
    if (!this.token) return false;

    const token = this.token;
    this.token = null;

    if (this.backend === "redis") {
      this.backend = null;
      return await releaseRedisLock(this.resource, token);
    }

    this.backend = null;
    return await clearFileLock(this.resource, token);
  }

  async renew(): Promise<boolean> {
    if (!this.token) return false;

    if (this.backend === "redis") {
      return await renewRedisLock(this.resource, this.token, this.ttlMs);
    }

    const existing = await readFileLock(this.resource);
    if (!existing || existing.token !== this.token) return false;

    await writeFileLock(this.resource, {
      ...existing,
      expiresAt: now() + this.ttlMs,
      createdAt: existing.createdAt ?? now(),
    });
    return true;
  }

  static async withLock<T>(resource: string, fn: () => Promise<T> | T, ttlMs = 30_000) {
    const lock = new DistributedLock(resource, ttlMs);
    const acquired = await lock.acquire();
    if (!acquired) {
      throw new Error(`Failed to acquire lock for ${resource}`);
    }

    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }
}

export function clearLockRegistryForTests() {
  try {
    fsSync.rmSync(lockDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  ensureDirPromise = null;
  redisClientReady = null;
  void redisClient?.quit().catch(() => undefined);
  redisClient = null;
}
