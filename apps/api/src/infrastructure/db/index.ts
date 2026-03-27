import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type Pool, type PoolOptions } from "mysql2/promise";
import { ENV } from "../config/env";
import { databaseSchema } from "./schema";

export * from "./schema";
export * from "./schema_outbox";
export * from "./schema_saga";
export * from "./schema_ledger";
export * from "./schema_idempotency";
export * from "./schema_wallet_id";
export * from "./schema_diaas";
export * from "./relations";

function createDatabase(pool: Pool) {
  return drizzle(pool, { schema: databaseSchema });
}

export type AppDatabase = ReturnType<typeof createDatabase>;

let pool: Pool | null = null;
let dbPromise: Promise<AppDatabase> | null = null;

function parseDatabaseUrl(databaseUrl: string): PoolOptions {
  const url = new URL(databaseUrl);
  if (!/^mysql(s)?:$/.test(url.protocol)) {
    throw new Error(`Unsupported database protocol: ${url.protocol}`);
  }

  const port = url.port ? Number(url.port) : 3306;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Invalid database port");
  }

  return {
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    waitForConnections: true,
    connectionLimit: ENV.dbConnectionLimit,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: url.searchParams.get("ssl") === "true" ? { rejectUnauthorized: true } : undefined,
  };
}

async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = mysql.createPool(parseDatabaseUrl(ENV.databaseUrl));
  }
  return pool as Pool;
}

export async function getDb(): Promise<AppDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => createDatabase(await getPool()))();
  }
  return dbPromise;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    dbPromise = null;
  }
}
