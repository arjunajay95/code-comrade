import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../errors/index.js";

export const requestTimeout = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const timer = setTimeout(() => {
    // Only respond if the handler has not already started responding.
    // Maps this condition to 503 REQUEST_TIMEOUT, produced here and
    // sent through the central error handler like every other error.
    if (!res.headersSent) {
      next(new AppError("Request timed out", 503, "REQUEST_TIMEOUT"));
    }
  }, env.REQUEST_TIMEOUT_MS);

  // Without clearing, every request would leave a timer running until it
  // expires. "finish" covers a normal response, "close" covers a client
  // that disconnects before one is sent.
  const clear = (): void => clearTimeout(timer);
  res.on("finish", clear);
  res.on("close", clear);

  next();
};
