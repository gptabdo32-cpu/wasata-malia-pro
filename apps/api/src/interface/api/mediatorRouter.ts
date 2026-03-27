import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../infrastructure/db";
import { chatConversations } from "../../infrastructure/db/schema";
import { assertParticipantOrAdmin } from "../../infrastructure/policy";
import { adminProcedure, protectedProcedure, router } from "../trpc/trpc";

const MEDIATOR_STATUSES = ["pending", "accepted", "active", "resolved", "cancelled"] as const;
const MEDIATOR_MESSAGE_TYPES = ["text", "decision", "freeze", "unfreeze", "evidence_request"] as const;

type MediatorStatus = (typeof MEDIATOR_STATUSES)[number];

type SqlExecutor = {
  execute: (query: unknown) => Promise<unknown>;
};

async function getRows(query: unknown, executor?: SqlExecutor) {
  const db = executor ?? await getDb();
  const result = await db.execute(query as any);
  const rows = Array.isArray((result as any)[0]) ? (result as any)[0] : (result as any).rows ?? [];
  return rows as any[];
}

async function getSingleRequest(requestId: number) {
  const rows = await getRows(sql`SELECT * FROM mediator_requests WHERE id = ${requestId} LIMIT 1`);
  return rows[0] ?? null;
}

async function getConversationById(conversationId: number) {
  const db = await getDb();
  const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, conversationId)).limit(1);
  return conversation ?? null;
}

function sameEscrowPair(escrow: any, conversation: any) {
  return Boolean(escrow && conversation && (
    (Number(escrow.buyerId) === Number(conversation.buyerId) && Number(escrow.sellerId) === Number(conversation.sellerId)) ||
    (Number(escrow.buyerId) === Number(conversation.sellerId) && Number(escrow.sellerId) === Number(conversation.buyerId))
  ));
}

export const mediatorRouter = router({
  requestMediator: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), escrowId: z.number().int().positive(), reason: z.string().min(10).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const conversationRows = await getRows(sql`SELECT * FROM chatConversations WHERE id = ${input.conversationId} LIMIT 1 FOR UPDATE`, tx as unknown as SqlExecutor);
        const conversation = conversationRows[0] ?? null;
        if (!conversation) throw new Error("Conversation not found");
        assertParticipantOrAdmin(ctx.user, [conversation.buyerId, conversation.sellerId]);

        const escrowRows = await getRows(sql`SELECT id, buyerId, sellerId, status FROM escrows WHERE id = ${input.escrowId} LIMIT 1 FOR UPDATE`, tx as unknown as SqlExecutor);
        const escrow = escrowRows[0] ?? null;
        if (!escrow) throw new Error("Escrow not found");
        if (!sameEscrowPair(escrow, conversation)) {
          throw new Error("Escrow does not match this conversation");
        }
        if (![escrow.buyerId, escrow.sellerId].includes(ctx.user.id) && ctx.user.role !== "admin") {
          throw new Error("Access denied");
        }
        const escrowStatus = String(escrow.status).toUpperCase();
        if (["RELEASED", "CANCELLED", "REFUNDED"].includes(escrowStatus)) {
          throw new Error("Escrow is closed and cannot be mediated");
        }

        const existingRows = await getRows(sql`
          SELECT id, status FROM mediator_requests
          WHERE conversationId = ${input.conversationId} AND escrowId = ${input.escrowId}
          ORDER BY id DESC LIMIT 1 FOR UPDATE
        `, tx as unknown as SqlExecutor);
        const existingRequest = existingRows[0] ?? null;
        if (existingRequest && !["resolved", "cancelled"].includes(String(existingRequest.status))) {
          await tx.execute(sql`
            UPDATE chatConversations
            SET hasMediator = 1, isFrozen = 1, frozenReason = ${input.reason}, updatedAt = NOW()
            WHERE id = ${input.conversationId}
          ` as any);
          return { success: true, requestId: Number(existingRequest.id) } as const;
        }

        await tx.execute(sql`
          INSERT INTO mediator_requests (conversationId, escrowId, requestedBy, status, fee, reason, requestedAt, createdAt, updatedAt)
          VALUES (${input.conversationId}, ${input.escrowId}, ${ctx.user.id}, 'pending', 10.00, ${input.reason}, NOW(), NOW(), NOW())
        ` as any);

        const rows = await getRows(sql`
          SELECT id FROM mediator_requests
          WHERE conversationId = ${input.conversationId} AND escrowId = ${input.escrowId}
          ORDER BY id DESC
          LIMIT 1
        `, tx as unknown as SqlExecutor);
        const requestId = Number(rows[0]?.id ?? 0);

        await tx.execute(sql`
          UPDATE chatConversations
          SET hasMediator = 1, mediatorRequestId = ${requestId}, isFrozen = 1, frozenReason = ${input.reason}, updatedAt = NOW()
          WHERE id = ${input.conversationId}
        ` as any);

        return { success: true, requestId } as const;
      });
    }),

  getMediatorRequest: protectedProcedure
    .input(z.object({ requestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const request = await getSingleRequest(input.requestId);
      if (!request) return null;

      const conversation = await getConversationById(Number(request.conversationId));
      if (conversation) {
        assertParticipantOrAdmin(ctx.user, [conversation.buyerId, conversation.sellerId, request.mediatorId]);
      }

      return request;
    }),
  getConversationMediatorRequest: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const rows = await getRows(sql`
        SELECT * FROM mediator_requests
        WHERE conversationId = ${input.conversationId}
        ORDER BY id DESC
        LIMIT 1
      `);
      const request = rows[0] ?? null;
      if (!request) return null;

      const conversation = await getConversationById(Number(request.conversationId));
      if (conversation) {
        assertParticipantOrAdmin(ctx.user, [conversation.buyerId, conversation.sellerId, request.mediatorId]);
      }

      return request;
    }),

  getMediatorMessages: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) return [];
      assertParticipantOrAdmin(ctx.user, [conversation.buyerId, conversation.sellerId, conversation.mediatorId]);

      const rows = await getRows(sql`
        SELECT * FROM mediator_messages
        WHERE conversationId = ${input.conversationId}
        ORDER BY createdAt ASC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);

      return rows.map((row) => ({
        id: row.id,
        senderId: row.senderId,
        messageType: row.messageType,
        content: row.content,
        isMediatorMessage: true,
        createdAt: row.createdAt,
        isSystemMessage: Boolean(row.isSystemMessage),
        canBeDeleted: Boolean(row.canBeDeleted),
      }));
    }),

  sendMediatorMessage: protectedProcedure
    .input(z.object({ mediatorRequestId: z.number().int().positive(), conversationId: z.number().int().positive(), content: z.string().min(1).max(5000), messageType: z.enum(MEDIATOR_MESSAGE_TYPES).default("text") }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const requestRows = await getRows(sql`SELECT * FROM mediator_requests WHERE id = ${input.mediatorRequestId} LIMIT 1 FOR UPDATE`, tx as unknown as SqlExecutor);
        const request = requestRows[0] ?? null;
        if (!request) throw new Error("Mediator request not found");
        if (Number(request.conversationId) !== input.conversationId) {
          throw new Error("Mediator request does not match the conversation");
        }
        if (["resolved", "cancelled"].includes(String(request.status))) {
          throw new Error("Mediator request is closed");
        }

        const conversation = await getConversationById(input.conversationId);
        if (!conversation) throw new Error("Conversation not found");
        assertParticipantOrAdmin(ctx.user, [conversation.buyerId, conversation.sellerId, request.mediatorId]);
        if (input.messageType !== "text" && ctx.user.id !== request.mediatorId && ctx.user.role !== "admin") {
          throw new Error("Only the assigned mediator can send system messages");
        }

        await tx.execute(sql`
          INSERT INTO mediator_messages (mediatorRequestId, conversationId, senderId, messageType, content, isSystemMessage, canBeDeleted, createdAt)
          VALUES (${input.mediatorRequestId}, ${input.conversationId}, ${ctx.user.id}, ${input.messageType}, ${input.content}, ${ctx.user.id === request.mediatorId ? 1 : 0}, ${input.messageType === "decision" ? 0 : 1}, NOW())
        ` as any);

        await tx.execute(sql`
          UPDATE mediator_requests SET status = 'active', updatedAt = NOW() WHERE id = ${input.mediatorRequestId}
        ` as any);
        await tx.execute(sql`
          UPDATE chatConversations SET lastMessage = ${input.content.slice(0, 255)}, updatedAt = NOW() WHERE id = ${input.conversationId}
        ` as any);

        return { success: true } as const;
      });
    }),

  closeMediatorRequest: protectedProcedure
    .input(z.object({ mediatorRequestId: z.number().int().positive(), conversationId: z.number().int().positive(), status: z.enum(["resolved", "cancelled"]), resolution: z.string().min(3).max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      return await db.transaction(async (tx) => {
        const requestRows = await getRows(sql`SELECT * FROM mediator_requests WHERE id = ${input.mediatorRequestId} LIMIT 1 FOR UPDATE`, tx as unknown as SqlExecutor);
        const request = requestRows[0] ?? null;
        if (!request) throw new Error("Mediator request not found");
        if (Number(request.conversationId) !== input.conversationId) throw new Error("Mediator request does not match the conversation");

        const conversation = await getConversationById(input.conversationId);
        if (!conversation) throw new Error("Conversation not found");
        assertParticipantOrAdmin(ctx.user, [conversation.buyerId, conversation.sellerId, request.mediatorId]);
        if (ctx.user.id !== request.mediatorId && ctx.user.role !== "admin") {
          throw new Error("Only the assigned mediator can close this request");
        }

        await tx.execute(sql`
          UPDATE mediator_requests
          SET status = ${input.status}, resolution = ${input.resolution ?? null}, resolvedAt = NOW(), updatedAt = NOW()
          WHERE id = ${input.mediatorRequestId}
        ` as any);
        await tx.execute(sql`
          UPDATE chatConversations
          SET hasMediator = 0, isFrozen = 0, frozenReason = NULL, updatedAt = NOW()
          WHERE id = ${input.conversationId}
        ` as any);

        return { success: true } as const;
      });
    }),
});

export const mediatorAdminRouter = router({
  getPendingRequests: adminProcedure.query(async () => {
    const rows = await getRows(sql`
      SELECT mr.*, c.buyerId, c.sellerId
      FROM mediator_requests mr
      LEFT JOIN chatConversations c ON c.id = mr.conversationId
      ORDER BY mr.createdAt DESC
    `);
    return rows.map((row) => ({
      ...row,
      status: row.status as MediatorStatus,
    }));
  }),
});
