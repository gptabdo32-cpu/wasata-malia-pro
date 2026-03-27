import { and, asc, desc, eq, or } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { ENV as ConfigEnv } from "../../infrastructure/config/env";
import { chatAttachments, chatConversations, chatMessages, users } from "../../infrastructure/db/schema";
import { assertParticipantOrAdmin, assertTrustedUploadUrl } from "../../infrastructure/policy";
import { storagePut } from "../../infrastructure/storage";
import { protectedProcedure, router } from "../trpc/trpc";
import { stableSerialize } from "../../infrastructure/utils/safeJson";

type AccessUser = { id: number; role?: string | null };

interface ChatPayload {
  type: "text" | "image" | "audio" | "file";
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaDuration?: number | null;
  fileName?: string | null;
}

const MAX_ATTACHMENT_BYTES = ConfigEnv.maxUploadSizeMB * 1024 * 1024;
const ALLOWED_IMAGE_MIME_PREFIXES = ["image/"];
const ALLOWED_AUDIO_MIME_PREFIXES = ["audio/"];

function serializeMessage(payload: ChatPayload): string {
  return stableSerialize(payload);
}

function parseMessage(raw: string | null | undefined): ChatPayload {
  if (!raw) return { type: "text", content: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<ChatPayload>;
    if (parsed && typeof parsed.type === "string" && typeof parsed.content === "string") {
      return {
        type: parsed.type as ChatPayload["type"],
        content: parsed.content,
        mediaUrl: parsed.mediaUrl ?? null,
        mediaType: parsed.mediaType ?? null,
        mediaDuration: typeof parsed.mediaDuration === "number" ? parsed.mediaDuration : null,
        fileName: parsed.fileName ?? null,
      };
    }
  } catch {
    // Backwards compatibility with old plain-text messages.
  }
  return { type: "text", content: raw };
}

function normalizeFileName(fileName: string): string {
  const base = fileName.split(/[\/]/).pop() ?? "attachment";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").trim();
  return cleaned || "attachment";
}

function safeTrustedUploadUrl(url: string | null | undefined, fieldName: string): string | undefined {
  if (!url) return undefined;
  try {
    return assertTrustedUploadUrl(url, fieldName);
  } catch {
    return undefined;
  }
}

function getInsertId(result: unknown): number {
  if (!result) return 0;
  if (typeof result === "object") {
    const record = result as Record<string, unknown>;
    const raw = record.insertId ?? record.id;
    const id = typeof raw === "number" ? raw : Number(raw ?? 0);
    if (Number.isInteger(id) && id > 0) return id;
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0] as Record<string, unknown> | undefined;
      const alt = first?.insertId ?? first?.id;
      const altId = typeof alt === "number" ? alt : Number(alt ?? 0);
      if (Number.isInteger(altId) && altId > 0) return altId;
    }
  }
  return 0;
}

function stripDataUrlPrefix(value: string) {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && commaIndex > 0) {
    return trimmed.slice(commaIndex + 1);
  }
  return trimmed;
}

function decodeBase64Attachment(base64Data: string) {
  const normalized = stripDataUrlPrefix(base64Data);
  if (!normalized) throw new Error("Invalid attachment payload");
  if (normalized.length > MAX_ATTACHMENT_BYTES * 2) {
    throw new Error("Attachment is too large");
  }
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0) {
    throw new Error("Invalid attachment payload");
  }
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment exceeds the maximum allowed size");
  }
  return buffer;
}

function validateMime(detectedMime: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some((prefix) => detectedMime.startsWith(prefix));
}

async function ensureConversationAccess(conversationId: number, user: AccessUser) {
  const db = await getDb();
  const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, conversationId)).limit(1);
  if (!conversation) return null;
  assertParticipantOrAdmin(user, [conversation.buyerId, conversation.sellerId]);
  return conversation;
}

async function persistAttachment(params: {
  conversationId: number;
  messageId: number;
  fileName: string;
  expectedFamily: "image" | "audio";
  allowedMimePrefixes: string[];
  base64Data: string;
}) {
  const db = await getDb();
  const buffer = decodeBase64Attachment(params.base64Data);
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected?.mime || !validateMime(detected.mime, params.allowedMimePrefixes)) {
    throw new Error(`Unsupported ${params.expectedFamily} attachment type`);
  }

  const safeFileName = normalizeFileName(params.fileName);
  const upload = await storagePut(`chat/${params.conversationId}/${params.messageId}-${safeFileName}`, buffer, detected.mime);
  const trustedUrl = assertTrustedUploadUrl(upload.url, "attachmentUrl");
  await db.insert(chatAttachments).values({
    messageId: params.messageId,
    fileUrl: trustedUrl,
    fileType: detected.mime,
    fileName: safeFileName,
  } as any);
  return { trustedUrl, detectedMime: detected.mime, fileName: safeFileName };
}

export const chatRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(or(eq(chatConversations.buyerId, ctx.user.id), eq(chatConversations.sellerId, ctx.user.id)))
      .orderBy(desc(chatConversations.updatedAt));

    const participantIds = Array.from(new Set(conversations.flatMap((c) => [c.buyerId, c.sellerId])));
    const participants = participantIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(or(...participantIds.map((id) => eq(users.id, id))))
      : [];
    const names = new Map(participants.map((u) => [u.id, u.name ?? `المستخدم #${u.id}`]));

    return conversations.map((conversation) => {
      const otherUserId = conversation.buyerId === ctx.user.id ? conversation.sellerId : conversation.buyerId;
      return {
        ...conversation,
        subject: `محادثة مع ${names.get(otherUserId) ?? `المستخدم #${otherUserId}`}`,
        otherUserId,
        otherUserName: names.get(otherUserId) ?? `المستخدم #${otherUserId}`,
      };
    });
  }),

  createConversation: protectedProcedure
    .input(z.object({ otherUserId: z.number().int().positive(), subject: z.string().min(1).max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.otherUserId === ctx.user.id) {
        throw new Error("You cannot create a conversation with yourself");
      }

      const db = await getDb();
      const buyerId = Math.min(ctx.user.id, input.otherUserId);
      const sellerId = Math.max(ctx.user.id, input.otherUserId);

      return await db.transaction(async (tx) => {
        const [otherUser] = await tx.select().from(users).where(eq(users.id, input.otherUserId)).limit(1);
        if (!otherUser) {
          throw new Error("Conversation partner not found");
        }
        if (otherUser.status && otherUser.status !== "active") {
          throw new Error("Conversation partner is not active");
        }

        const [existing] = await tx.select().from(chatConversations).where(and(eq(chatConversations.buyerId, buyerId), eq(chatConversations.sellerId, sellerId))).limit(1);
        if (existing) {
          return { success: true, conversationId: existing.id } as const;
        }

        const result = await tx.insert(chatConversations).values({
          buyerId,
          sellerId,
          lastMessage: input.subject ?? "محادثة جديدة",
        } as any);

        return {
          success: true,
          conversationId: getInsertId(result),
        } as const;
      });
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const conversation = await ensureConversationAccess(input.conversationId, ctx.user);
      if (!conversation) return [];

      const rows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, input.conversationId))
        .orderBy(asc(chatMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const attachments = rows.length > 0
        ? await db.select().from(chatAttachments).where(or(...rows.map((row) => eq(chatAttachments.messageId, row.id))))
        : [];
      const attachmentMap = new Map(attachments.map((a) => [a.messageId, a]));

      return rows.map((row) => {
        const payload = parseMessage(row.message);
        const attachment = attachmentMap.get(row.id) as any;
        return {
          id: row.id,
          senderId: row.senderId,
          messageType: payload.type,
          content: payload.content,
          mediaUrl: safeTrustedUploadUrl(payload.mediaUrl, "mediaUrl") ?? safeTrustedUploadUrl(attachment?.fileUrl, "attachmentUrl"),
          mediaType: payload.mediaType ?? attachment?.fileType ?? undefined,
          mediaDuration: payload.mediaDuration ?? undefined,
          createdAt: row.createdAt,
        };
      });
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), content: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const conversation = await ensureConversationAccess(input.conversationId, ctx.user);
      if (!conversation) throw new Error("Conversation not found");

      const result = await db.insert(chatMessages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        message: serializeMessage({ type: "text", content: input.content }),
      } as any);
      const messageId = getInsertId(result);

      await db.update(chatConversations).set({ lastMessage: input.content.slice(0, 255), updatedAt: new Date() } as any).where(eq(chatConversations.id, input.conversationId));

      return { success: true, messageId } as const;
    }),

  sendImage: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), imageData: z.string().min(1), fileName: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const conversation = await ensureConversationAccess(input.conversationId, ctx.user);
      if (!conversation) throw new Error("Conversation not found");

      const messageResult = await db.insert(chatMessages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        message: serializeMessage({ type: "image", content: input.fileName, fileName: input.fileName }),
      } as any);
      const messageId = getInsertId(messageResult);
      const safeFileName = normalizeFileName(input.fileName);
      const { trustedUrl, detectedMime } = await persistAttachment({
        conversationId: input.conversationId,
        messageId,
        fileName: safeFileName,
        expectedFamily: "image",
        allowedMimePrefixes: ALLOWED_IMAGE_MIME_PREFIXES,
        base64Data: input.imageData,
      });

      await db.update(chatMessages).set({
        message: serializeMessage({ type: "image", content: safeFileName, mediaUrl: trustedUrl, mediaType: detectedMime, fileName: safeFileName }),
      } as any).where(eq(chatMessages.id, messageId));
      await db.update(chatConversations).set({ lastMessage: `صورة: ${safeFileName}`, updatedAt: new Date() } as any).where(eq(chatConversations.id, input.conversationId));

      return { success: true, messageId, mediaUrl: trustedUrl } as const;
    }),

  sendAudio: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), audioData: z.string().min(1), duration: z.number().int().min(0).max(3600).default(0), fileName: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const conversation = await ensureConversationAccess(input.conversationId, ctx.user);
      if (!conversation) throw new Error("Conversation not found");

      const messageResult = await db.insert(chatMessages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        message: serializeMessage({ type: "audio", content: input.fileName, mediaDuration: input.duration, fileName: input.fileName }),
      } as any);
      const messageId = getInsertId(messageResult);
      const safeFileName = normalizeFileName(input.fileName);
      const { trustedUrl, detectedMime } = await persistAttachment({
        conversationId: input.conversationId,
        messageId,
        fileName: safeFileName,
        expectedFamily: "audio",
        allowedMimePrefixes: ALLOWED_AUDIO_MIME_PREFIXES,
        base64Data: input.audioData,
      });

      await db.update(chatMessages).set({
        message: serializeMessage({ type: "audio", content: safeFileName, mediaUrl: trustedUrl, mediaType: detectedMime, mediaDuration: input.duration, fileName: safeFileName }),
      } as any).where(eq(chatMessages.id, messageId));
      await db.update(chatConversations).set({ lastMessage: `رسالة صوتية (${input.duration}s)`, updatedAt: new Date() } as any).where(eq(chatConversations.id, input.conversationId));

      return { success: true, messageId, mediaUrl: trustedUrl } as const;
    }),
});
