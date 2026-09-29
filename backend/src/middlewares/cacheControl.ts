import type { NextFunction, Request, Response } from "express";

// The three caching policies the API uses.
export const CACHE_NONE = "no-store";
export const CACHE_REVALIDATE = "public, max-age=0, must-revalidate";
export const CACHE_FIVE_MINUTES = "public, max-age=300";

// Sets the Cache-Control header. Mounted once in app.ts with CACHE_NONE as
// the default, then again on a public route to opt it into caching. A later
// setHeader replaces an earlier one, so the route's policy wins.
export const cacheControl =
  (policy: string) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Cache-Control", policy);
    next();
  };
