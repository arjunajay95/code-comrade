import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../errors/index.js";

// Registered after every route, so anything reaching it matched nothing.
// The message deliberately does not echo the requested path back, which
// is the "no route leakage" rule.
export const notFoundHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new NotFoundError("Resource not found", "NOT_FOUND"));
};
