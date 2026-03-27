import { z } from "zod";
import { createCorrelationId } from "@shared/ids";
import { Logger } from "../../infrastructure/observability";
import { notifyOwner } from "../../infrastructure/notifications";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure.query(({ ctx }) => {
    const correlationId = ctx.correlationId || createCorrelationId();
    Logger.info("Health check requested", { correlationId, uptime: process.uptime() });
    return { ok: true, correlationId, serverTime: new Date().toISOString(), uptimeSeconds: Math.round(process.uptime()) };
  }),
  notifyOwner: adminProcedure.input(z.object({ title: z.string().min(1), content: z.string().min(1) })).mutation(async ({ input, ctx }) => {
    const correlationId = ctx.correlationId || createCorrelationId();
    Logger.info("Notify owner request received", { correlationId, title: input.title });
    const delivered = await notifyOwner({ ...input, userId: ctx.user.id }, correlationId);
    const success = typeof delivered === "object" && delivered !== null
      ? "success" in delivered
        ? Boolean((delivered as { success?: unknown }).success)
        : Boolean(delivered)
      : Boolean(delivered);
    return { success, correlationId } as const;
  }),
});
