import { PrismaClient } from "../generated/client/index.js";

declare global {
  // eslint-disable-next-line no-var
  var __rexfootPrisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient partagé entre apps/web et apps/worker.
 * En dev, on le met en cache sur `globalThis` pour éviter d'ouvrir une
 * nouvelle connexion à chaque hot-reload de Next.js.
 */
export const prisma: PrismaClient =
  globalThis.__rexfootPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__rexfootPrisma = prisma;
}

export * from "../generated/client/index.js";
export * from "./vapid";
