import { timingSafeEqual } from "node:crypto";

export function constantTimeEquals(left: string, right: string) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
