import type { NextFunction, Request, Response } from "express";

const CLERK_AUTH_HEADER_PREFIX = "x-clerk-auth-";

// clerkMiddleware adds x-clerk-auth-* headers explaining why a token was
// rejected (expired, bad signature, wrong authorized party). Useful when
// debugging locally, but in production they give anyone probing the API
// precise feedback on each forged token. Matching the prefix, instead of
// listing three names, also covers any header Clerk adds in future.
export const stripClerkAuthHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  for (const name of res.getHeaderNames()) {
    if (name.startsWith(CLERK_AUTH_HEADER_PREFIX)) {
      res.removeHeader(name);
    }
  }
  next();
};
