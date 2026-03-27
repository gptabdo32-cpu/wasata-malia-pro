import { router } from "../trpc/trpc";
import { chatRouter } from "./chatRouter";
import { disputeRouter } from "./disputeRouter";
import { escrowRouter } from "./escrowRouter";
import { mediatorRouter } from "./mediatorRouter";
import { systemRouter } from "./systemRouter";
import { authRouter, behavioralRouter, disputeCollateralRouter, adminRouter, diaasRouter, inspectionServiceRouter, mediatorAdminRouter, productsRouter, smartEscrowRouter, timedLinksRouter, trustRouter, userRouter, verifyRouter, walletIdRouter, walletRouter } from "./platformRouters";

export const appRouter = router({
  auth: authRouter,
  behavioral: behavioralRouter,
  chat: chatRouter,
  admin: adminRouter,
  diaas: diaasRouter,
  dispute: disputeRouter,
  disputeCollateral: disputeCollateralRouter,
  escrow: escrowRouter,
  inspectionService: inspectionServiceRouter,
  mediator: mediatorRouter,
  mediatorAdmin: mediatorAdminRouter,
  products: productsRouter,
  smartEscrow: smartEscrowRouter,
  system: systemRouter,
  timedLinks: timedLinksRouter,
  trust: trustRouter,
  user: userRouter,
  verify: verifyRouter,
  wallet: walletRouter,
  walletId: walletIdRouter,
});

export type AppRouter = typeof appRouter;
