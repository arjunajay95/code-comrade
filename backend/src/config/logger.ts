import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "clerkId",
      "*.clerkId",
      "token",
      "*.token",
      "CLERK_SECRET_KEY",
    ],
    censor: "[REDACTED]",
  },

  transport:
    env.NODE_ENV === "development" && process.stdout.isTTY
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
