import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const catchAsync = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch((err: unknown) => {
      // A response already went out, usually because requestTimeout sent a
      // 503 while this handler was still running. By then the router has
      // already moved past errorHandler, so calling next() here would hand
      // the error to Express's default handler, which prints a bare stack
      // to stderr. Logging here keeps it in Pino with the request id.
      if (res.headersSent) {
        req.log.error({ err }, "Error after response was already sent");
        // If the response is still mid-stream, cut the connection rather
        // than leave the client waiting on a half-written body.
        if (!res.writableEnded) req.socket.destroy();
        return;
      }
      next(err);
    });
  };
};
