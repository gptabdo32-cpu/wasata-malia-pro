import { z } from "zod";

/**
 * Base Event Envelope
 */
export const BaseEventSchema = z.object({
  eventId: z.string().uuid().or(z.string().regex(/^evt_/)),
  timestamp: z.date().default(() => new Date()),
  version: z.number().int().positive(),
  aggregateType: z.string(),
  aggregateId: z.number().int(),
  eventType: z.string(),
  idempotencyKey: z.string(),
});

/**
 * Escrow Funds Locked Event
 */
export const EscrowFundsLockedSchema = BaseEventSchema.extend({
  eventType: z.literal("EscrowFundsLocked"),
  payload: z.object({
    escrowId: z.number().int(),
    buyerId: z.number().int(),
    sellerId: z.number().int(),
    amount: z.string(),
  }),
});

/**
 * Escrow Funds Released Event
 */
export const EscrowFundsReleasedSchema = BaseEventSchema.extend({
  eventType: z.literal("EscrowFundsReleased"),
  payload: z.object({
    escrowId: z.number().int(),
    sellerId: z.number().int(),
    amount: z.string(),
  }),
});

/**
 * Escrow Dispute Opened Event
 */
export const EscrowDisputeOpenedSchema = BaseEventSchema.extend({
  eventType: z.literal("EscrowDisputeOpened"),
  payload: z.object({
    escrowId: z.number().int(),
    initiatorId: z.number().int(),
    reason: z.string(),
    disputeId: z.number().int(),
  }),
});

export type EscrowFundsLockedEvent = z.infer<typeof EscrowFundsLockedSchema>;
export type EscrowFundsReleasedEvent = z.infer<typeof EscrowFundsReleasedSchema>;
export type EscrowDisputeOpenedEvent = z.infer<typeof EscrowDisputeOpenedSchema>;
