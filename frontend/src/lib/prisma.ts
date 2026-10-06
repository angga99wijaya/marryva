import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL before starting the application.");

const datasourceUrl = new URL(databaseUrl);
if (datasourceUrl.port === "6543") {
  datasourceUrl.searchParams.set("pgbouncer", "true");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl.toString() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
