import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@contracts/trpc";

export const trpc = createTRPCReact<AppRouter>();
