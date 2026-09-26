import type { Request } from "express";
import { UnauthorizedError } from "../errors/index.js";
import type { AuthUser } from "../types/express.js";

// Behind requireAuth, req.user always exists. If a route is ever mounted
// without the guard by mistake, this fails closed with a 401 instead of
// crashing on undefined further down.
export const requireUser = (req: Request): AuthUser => {
  if (!req.user) {
    throw new UnauthorizedError("Authentication required", "UNAUTHORIZED");
  }
  return req.user;
};
