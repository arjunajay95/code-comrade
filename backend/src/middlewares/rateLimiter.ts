import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { HEALTH_PATH_PREFIX } from "../config/constants.js";
import { AppError } from "../errors/index.js";

// The library's default 429 response is plain text, which would break the
// rule that every response uses the envelope.
// Forwarding an AppError to next() sends it through the central error
// handler instead, so a 429 looks like every other error. This
// is a "produced by the limiter" condition with no dedicated subclass, which
// is why the base AppError is used directly.
const rateLimitHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(
    new AppError("Too many requests, please slow down", 429, "RATE_LIMITED"),
  );
};

// 100 requests per 15 minutes per client across all of /api/v1.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,

  // Sends the standard RateLimit headers so well-behaved clients can see
  // their remaining budget, and drops the older X-RateLimit-* variants.
  standardHeaders: "draft-8",
  legacyHeaders: false,

  // Health probes never spend the budget. originalUrl is
  // used rather than path because this limiter is mounted on /api/v1,
  // and inside a mounted middleware req.path has that prefix stripped.
  skip: (req) => req.originalUrl.startsWith(HEALTH_PATH_PREFIX),

  handler: rateLimitHandler,
});

// 5 writes per minute per client, mounted after requireAuth on
// every write route. The test suite creates many fixtures in quick
// succession, so RATE_LIMIT_WRITE_TEST lifts the cap during test runs
// only. It is never set in staging or production.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_WRITE_TEST ? 1000 : 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});
