import { z } from "zod";

export const openDisputeSchema = z.object({
  escrowId: z.number().int().positive(),
  initiatorId: z.number().int().positive(),
  reason: z.string().min(10).max(1000),
});

export const resolveDisputeSchema = z.object({
  disputeId: z.number().int().positive(),
  adminId: z.number().int().positive(),
  resolution: z.enum(["buyer_refund", "seller_payout"]),
});

export type OpenDisputeRequest = z.infer<typeof openDisputeSchema>;
export type ResolveDisputeRequest = z.infer<typeof resolveDisputeSchema>;
