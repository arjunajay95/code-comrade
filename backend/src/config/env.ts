import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_TEST: z.string().optional(),

  ALLOWED_ORIGINS: z
    .string()
    .min(1, "ALLOWED_ORIGINS is required")
    .transform((value) => value.split(",").map((origin) => origin.trim())),

  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  BODY_LIMIT: z.string().default("100kb"),

  RATE_LIMIT_WRITE_TEST: z.coerce.boolean().optional(),

  GITHUB_TOKEN: z.string().optional(),

  REPO_SNAPSHOT_STALE_HOURS: z.coerce.number().int().positive().default(24),
  IDEMPOTENCY_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
  IDEMPOTENCY_INFLIGHT_TIMEOUT_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:");
  // eslint-disable-next-line no-console
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
