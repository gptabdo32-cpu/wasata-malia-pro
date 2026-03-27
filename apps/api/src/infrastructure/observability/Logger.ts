import { safeStringify } from "../utils/safeJson";

type LogMeta = Record<string, unknown> | undefined;

function formatMeta(meta?: LogMeta) {
  if (!meta) return "";
  return ` ${safeStringify(meta)}`;
}

function formatError(error?: unknown) {
  if (error === undefined) return "";
  if (error instanceof Error) {
    return safeStringify({ name: error.name, message: error.message, stack: error.stack });
  }
  return safeStringify(error);
}

export class Logger {
  static info(message: string, meta?: LogMeta) {
    console.info(`[INFO] ${message}${formatMeta(meta)}`);
  }
  static warn(message: string, meta?: LogMeta) {
    console.warn(`[WARN] ${message}${formatMeta(meta)}`);
  }
  static error(message: string, error?: unknown, meta?: LogMeta) {
    const errorSuffix = error !== undefined ? ` | ${formatError(error)}` : "";
    console.error(`[ERROR] ${message}${errorSuffix}${formatMeta(meta)}`);
  }
  static debug(message: string, meta?: LogMeta) {
    console.debug(`[DEBUG] ${message}${formatMeta(meta)}`);
  }
}
