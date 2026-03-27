export function getInsertId(result: unknown): number {
  if (!result || typeof result !== "object") return 0;
  const record = result as Record<string, unknown>;
  const raw = record.insertId ?? record.id;
  const id = typeof raw === "number" ? raw : Number(raw ?? 0);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export function normalizeJsonUrls(urls: unknown[]): string[] {
  return urls.map((value) => String(value ?? "").trim()).filter(Boolean);
}
