import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

// Exported so shutdown (backend/index.ts) can close it.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Without this, a new connection attempt against an unreachable database
  // waits indefinitely. A readiness probe needs to fail fast instead.
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
