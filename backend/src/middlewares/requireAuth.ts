import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/index.js";
import { authService } from "../service/auth.service.js";
import { catchAsync } from "../utils/catchAsync.js";

// The one gate for protected routes. Past this middleware, a local
// User row exists and sits on req.user. Nothing downstream ever sees a
// Clerk identifier.
export const requireAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // clerkMiddleware has already verified the token, if there was one.
    // userId is null for a missing, invalid, or expired session.
    const { userId } = getAuth(req);
    if (!userId) {
      throw new UnauthorizedError("Authentication required", "UNAUTHORIZED");
    }

    req.user = await authService.resolveUser(userId);
    next();
  },
);
