import { randomUUID } from "node:crypto";

export function createUuid(): string {
  const webCrypto = globalThis.crypto as Crypto | undefined;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return randomUUID();
}

export function createCorrelationId(): string {
  return createUuid();
}

export function createRequestId(prefix = "req"): string {
  return `${prefix}_${createUuid().replace(/-/g, "")}`;
}
