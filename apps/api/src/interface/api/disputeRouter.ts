import { asc, desc, eq, or } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { getInsertId } from "../../infrastructure/db/helpers";
import { disputeEvidence, disputeMessages, disputes, escrows, users } from "../../infrastructure/db/schema";
import { assertParticipantOrAdmin, assertTrustedUploadUrl } from "../../infrastructure/policy/access";
import { storagePut } from "../../infrastructure/storage";
import { ENV as ConfigEnv } from "../../infrastructure/config/env";
import { protectedProcedure, router } from "../trpc/trpc";

const MAX_EVIDENCE_BYTES = ConfigEnv.maxUploadSizeMB * 1024 * 1024;

const getThreadInput = z.object({
  escrowId: z.number().int().positive(),
});

const messageInput = z.object({
  escrowId: z.number().int().positive(),
  message: z.string().min(1).max(2000),
});

const evidenceUploadInput = z.object({
  escrowId: z.number().int().positive(),
  fileName: z.string().min(1).max(255),
  fileData: z.string().min(1),
  description: z.string().max(1000).optional(),
  fileType: z.enum(["image", "video", "document"]).optional(),
});

function stripDataUrlPrefix(value: string) {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && commaIndex > 0) {
    return trimmed.slice(commaIndex + 1);
  }
  return trimmed;
}

function normalizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "evidence";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").trim();
  return cleaned || "evidence";
}

function inferEvidenceType(mime: string | undefined, fileName: string): "image" | "video" | "document" {
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  const name = fileName.toLowerCase();
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".gif")) return "image";
  if (name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm") || name.endsWith(".mkv")) return "video";
  return "document";
}

function decodeEvidencePayload(base64Data: string) {
  const normalized = stripDataUrlPrefix(base64Data);
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0) {
    throw new Error("Invalid evidence payload");
  }
  if (buffer.length > MAX_EVIDENCE_BYTES) {
    throw new Error("Evidence file exceeds the maximum allowed size");
  }
  return buffer;
}

type AuthContext = {
  user: { id: number; role?: string | null };
};

async function getEscrowThread(escrowId: number, userId: number) {
  const db = await getDb();
  const [escrow] = await db.select().from(escrows).where(eq(escrows.id, escrowId)).limit(1);
  if (!escrow) {
    throw new Error("Escrow not found");
  }
  assertParticipantOrAdmin({ id: userId }, [escrow.buyerId, escrow.sellerId]);

  const [dispute] = await db.select().from(disputes).where(eq(disputes.escrowId, escrowId)).limit(1);
  const messages = await db.select().from(disputeMessages).where(eq(disputeMessages.escrowId, escrowId)).orderBy(asc(disputeMessages.createdAt));
  const evidence = await db.select().from(disputeEvidence).where(eq(disputeEvidence.escrowId, escrowId)).orderBy(desc(disputeEvidence.createdAt));

  const participantIds = Array.from(
    new Set(
      [
        escrow.buyerId,
        escrow.sellerId,
        dispute?.initiatorId,
        ...messages.map((row: any) => row.senderId),
        ...evidence.map((row: any) => row.uploaderId),
      ].filter((value): value is number => typeof value === "number" && Number.isInteger(value))
    )
  );

  const people =
    participantIds.length > 0
      ? await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(or(...participantIds.map((id) => eq(users.id, id))))
      : [];

  const nameById = new Map<number, { name: string | null; role: string }>();
  for (const person of people as Array<{ id: number; name: string | null; role: string }>) {
    nameById.set(person.id, { name: person.name ?? `User ${person.id}`, role: person.role });
  }

  return {
    escrow,
    dispute: dispute ?? null,
    messages: messages.map((row: any) => ({
      ...row,
      senderName: nameById.get(row.senderId)?.name ?? `User ${row.senderId}`,
      senderRole: nameById.get(row.senderId)?.role ?? "user",
    })),
    evidence: evidence.map((row: any) => ({
      ...row,
      uploaderName: nameById.get(row.uploaderId)?.name ?? `User ${row.uploaderId}`,
      uploaderRole: nameById.get(row.uploaderId)?.role ?? "user",
    })),
  };
}

export const disputeRouter = router({
  getThread: protectedProcedure.input(getThreadInput).query(async ({ ctx, input }: { ctx: AuthContext; input: { escrowId: number } }) => {
    return await getEscrowThread(input.escrowId, ctx.user.id);
  }),

  openOrGetDispute: protectedProcedure
    .input(
      z.object({
        escrowId: z.number().int().positive(),
        reason: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: AuthContext; input: { escrowId: number; reason: string } }) => {
      const db = await getDb();
      return await db.transaction(async (tx: any) => {
        const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
        if (!escrow) throw new Error("Escrow not found");
        assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);

        const [existing] = await tx.select().from(disputes).where(eq(disputes.escrowId, input.escrowId)).limit(1);
        if (existing) {
          return { success: true as const, disputeId: existing.id, created: false as const };
        }

        const insertResult = await tx.insert(disputes).values({
          escrowId: input.escrowId,
          initiatorId: ctx.user.id,
          reason: input.reason,
          status: "open",
        } as any);

        return {
          success: true as const,
          disputeId: getInsertId(insertResult),
          created: true as const,
        };
      });
    }),

  sendMessage: protectedProcedure.input(messageInput).mutation(async ({ ctx, input }: { ctx: AuthContext; input: { escrowId: number; message: string } }) => {
    const db = await getDb();
    return await db.transaction(async (tx: any) => {
      const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
      if (!escrow) throw new Error("Escrow not found");
      assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);

      const [dispute] = await tx.select().from(disputes).where(eq(disputes.escrowId, input.escrowId)).limit(1);
      if (!dispute) throw new Error("Dispute not found. Open the dispute first.");

      const result = await tx.insert(disputeMessages).values({
        escrowId: input.escrowId,
        senderId: ctx.user.id,
        message: input.message.trim(),
      } as any);

      if (dispute.status === "open") {
        await tx.update(disputes).set({ status: "under_review", updatedAt: new Date() } as any).where(eq(disputes.id, dispute.id));
      }

      return { success: true as const, messageId: getInsertId(result) };
    });
  }),

  uploadEvidenceFile: protectedProcedure
    .input(evidenceUploadInput)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: AuthContext;
        input: { escrowId: number; fileName: string; fileData: string; description?: string; fileType?: "image" | "video" | "document" };
      }) => {
        const db = await getDb();
        return await db.transaction(async (tx: any) => {
          const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, input.escrowId)).limit(1);
          if (!escrow) throw new Error("Escrow not found");
          assertParticipantOrAdmin(ctx.user, [escrow.buyerId, escrow.sellerId]);

          const [dispute] = await tx.select().from(disputes).where(eq(disputes.escrowId, input.escrowId)).limit(1);
          if (!dispute) throw new Error("Dispute not found. Open the dispute first.");

          const buffer = decodeEvidencePayload(input.fileData);
          const detected = await fileTypeFromBuffer(buffer);
          const fileType = input.fileType ?? inferEvidenceType(detected?.mime, input.fileName);
          const safeFileName = normalizeFileName(input.fileName);
          const upload = await storagePut(
            `disputes/${input.escrowId}/${Date.now()}-${nanoid(8)}-${safeFileName}`,
            buffer,
            detected?.mime ?? "application/octet-stream"
          );
          const trustedUrl = assertTrustedUploadUrl(upload.url, "evidenceUrl");

          const result = await tx.insert(disputeEvidence).values({
            escrowId: input.escrowId,
            uploaderId: ctx.user.id,
            fileUrl: trustedUrl,
            fileType,
            description: input.description?.trim() || null,
          } as any);

          if (dispute.status === "open") {
            await tx.update(disputes).set({ status: "under_review", updatedAt: new Date() } as any).where(eq(disputes.id, dispute.id));
          }

          return {
            success: true as const,
            evidenceId: getInsertId(result),
            fileUrl: trustedUrl,
            fileType,
          };
        });
      }
    ),
});
