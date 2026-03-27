import IORedis from "ioredis";
import { ENV } from "../config/env";

type JsonValue = unknown;

const REDIS_URL = ENV.redisUrl || "redis://127.0.0.1:6379";

/**
 * CacheManager
 * Phase 3.9: Caching using Redis.
 * Improves performance for frequently accessed data like user sessions and escrow states.
 */
export class CacheManager {
  private static redis: IORedis | null = null;

  private static getClient() {
    if (!this.redis) {
      this.redis = new IORedis(REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
    }
    return this.redis;
  }

  private static async ensureReady(): Promise<IORedis | null> {
    try {
      const client = this.getClient();
      if (client.status === "ready" || client.status === "connecting") {
        return client;
      }
      await client.connect();
      return client.status === "ready" || client.status === "connecting" ? client : null;
    } catch {
      return null;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    const client = await this.ensureReady();
    if (!client) return null;
    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  static async set(key: string, value: JsonValue, ttlSeconds = 3600): Promise<void> {
    const client = await this.ensureReady();
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Cache is best-effort only.
    }
  }

  static async del(key: string): Promise<void> {
    const client = await this.ensureReady();
    if (!client) return;
    try {
      await client.del(key);
    } catch {
      // Cache is best-effort only.
    }
  }

  static async ping(): Promise<boolean> {
    const client = await this.ensureReady();
    if (!client) return false;
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  static async close(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    } finally {
      this.redis = null;
    }
  }
}
