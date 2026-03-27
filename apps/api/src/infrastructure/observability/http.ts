import type { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import { httpRequestDuration } from "./metricsServer";
import { Logger } from "./Logger";

function isSensitivePath(path: string) {
  return /\/api\/(oauth|upload|trpc)/.test(path);
}

function sanitizeContext(req: Request) {
  return {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    hasAuthHeader: Boolean(req.headers.authorization),
    origin: req.headers.origin,
  };
}

export function createRequestTelemetryMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers["x-correlation-id"]?.toString().trim() || nanoid(16)).slice(0, 64);
    const start = process.hrtime.bigint();

    res.setHeader("x-correlation-id", correlationId);
    (req as any).correlationId = correlationId;

    res.on("finish", () => {
      const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const route = req.route?.path || req.path;
      try {
        httpRequestDuration.labels(req.method, route, String(res.statusCode)).observe(elapsedSeconds);
      } catch {
        // no-op
      }

      const context = { correlationId, status: res.statusCode, durationMs: Math.round(elapsedSeconds * 1000), ...sanitizeContext(req) };
      if (res.statusCode >= 500) Logger.error("HTTP request failed", undefined, context);
      else if (res.statusCode >= 400 && isSensitivePath(req.path)) Logger.warn("HTTP client error", context);
      else Logger.info("HTTP request completed", context);
    });

    next();
  };
}
