import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "X-Request-Id";

// Always generates a fresh id on the server. Any X-Request-Id the client
// sends is ignored on purpose, since a client-controlled value would flow
// straight into the logs and could be used to inject text or spoof
// another request's id.
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const id = randomUUID();
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
