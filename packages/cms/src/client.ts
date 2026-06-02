import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. Prevents connection exhaustion under Next.js dev
 * hot-reload (a new client per reload would otherwise pile up).
 */
const globalForPrisma = globalThis as unknown as { cmsPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.cmsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.cmsPrisma = prisma;
