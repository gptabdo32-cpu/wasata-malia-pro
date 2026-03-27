function sortKeys(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") return value.toString();
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: sortKeys((value as Error & { cause?: unknown }).cause, seen),
    };
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item, seen));
  }

  if (value instanceof Map) {
    return Array.from(value.entries()).sort(([a], [b]) => String(a).localeCompare(String(b))).map(([key, entryValue]) => [sortKeys(key, seen), sortKeys(entryValue, seen)]);
  }

  if (value instanceof Set) {
    return Array.from(value.values())
      .map((item) => sortKeys(item, seen))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    output[key] = sortKeys((value as Record<string, unknown>)[key], seen);
  }
  return output;
}

export function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(sortKeys(value));
  } catch {
    try {
      return JSON.stringify(String(value));
    } catch {
      return '"[Unserializable]"';
    }
  }
}

export function safeStringify(value: unknown, space = 0): string {
  try {
    const normalized = sortKeys(value);
    return JSON.stringify(normalized, null, space);
  } catch {
    try {
      return JSON.stringify(String(value));
    } catch {
      return '"[Unserializable]"';
    }
  }
}
