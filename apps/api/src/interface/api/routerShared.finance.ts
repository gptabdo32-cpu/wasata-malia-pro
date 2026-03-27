import { randomUUID } from "node:crypto";

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function makeId(prefix = "id") {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function parseAmount(input: string) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) throw new Error("Amount is required");
  if (!MONEY_PATTERN.test(trimmed)) {
    throw new Error("Amount must be a valid positive number with at most 2 decimal places");
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  return Number(amount.toFixed(2));
}

export function formatAmount(input: string | number, decimals = 2) {
  const value = typeof input === "number" ? input : parseAmount(input);
  return Number(value).toFixed(decimals);
}
