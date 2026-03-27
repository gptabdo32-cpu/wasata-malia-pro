import { getDb } from "../db";
import { getInsertId } from "../db/helpers";
import { notifications } from "../db/schema";
import { assertSafeLink } from "../policy/access";

type NotificationPayload = { title: string; content: string; link?: string | null; userId: number };

function normalizeLink(link?: string | null) {
  if (!link) return null;
  return assertSafeLink(link, "notification link");
}

export async function notifyOwner(payload: NotificationPayload, correlationId?: string) {
  if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
    throw new Error("Notification target userId is required");
  }
  const db = await getDb();
  const link = normalizeLink(payload.link);
  const inserted = await db.insert(notifications).values({
    userId: payload.userId,
    type: "system",
    title: String(payload.title).slice(0, 255),
    message: String(payload.content).slice(0, 4000),
    link,
    isRead: false,
  } as any);
  return { success: true, correlationId, payload, notificationId: getInsertId(inserted) } as const;
}

export async function sendVerificationNotification(userId: number, message = "Verification completed") {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Valid userId is required");
  }
  const db = await getDb();
  await db.insert(notifications).values({
    userId,
    type: "system",
    title: "Verification update",
    message: String(message).slice(0, 4000),
    link: null,
    isRead: false,
  } as any);
  return { success: true } as const;
}
