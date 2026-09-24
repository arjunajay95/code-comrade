import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/index.js";

// Express's JSON body parser throws plain errors tagged with a "type"
// field rather than AppErrors. These two are client mistakes, not server
// failures, so they are translated here instead of falling through to 500.
interface BodyParserError extends Error {
  type?: string;
}

const toAppError = (err: unknown): AppError | null => {
  if (err instanceof AppError) return err;

  if (err instanceof Error && "type" in err) {
    const { type } = err as BodyParserError;

    if (type === "entity.too.large") {
      return new AppError(
        "Request body is too large",
        413,
        "PAYLOAD_TOO_LARGE",
      );
    }
    if (type === "entity.parse.failed") {
      return new AppError(
        "Request body is not valid JSON",
        400,
        "VALIDATION_ERROR",
      );
    }
  }

  return null;
};

// Express only treats a middleware as an error handler when it declares
// all four parameters, so _next stays in the signature even though it is
// unused. The underscore marks that as intentional.
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // A response already started and then something failed, for example a
  // streamed response that errors partway through. Timed-out async
  // handlers never reach this branch, catchAsync handles those before
  // they get here. Logging here keeps the error in Pino with its request
  // id instead of Express's default handler printing to stderr.
  if (res.headersSent) {
    req.log.error({ err }, "Error after response was already sent");
    // Mirrors what Express's default handler does: if the response is
    // still mid-stream, cut the connection so the client is not left
    // waiting on a half-written body.
    if (!res.writableEnded) req.socket.destroy();
    return;
  }

  const appError = toAppError(err);

  // Known, intentional errors. The message was written for the client, so
  // it is safe to return as-is.
  if (appError?.isOperational) {
    // A known 5xx still means something on the server side is wrong, a
    // dependency down or a request timing out. Logging it here, through
    // req.log, ties the line to the same request id the client receives.
    // 4xx errors are the client's mistake and are already covered by the
    // request log line.
    if (appError.statusCode >= 500) {
      req.log.error({ err: appError }, "Operational server error");
    }

    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.id,
      },
    });
    return;
  }

  // Everything else is unexpected. The full error, stack included, goes to
  // the log tagged with this request's id. The client gets nothing internal,
  // only the id to quote when reporting the problem.
  req.log.error({ err }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL",
      message: "Something went wrong",
      requestId: req.id,
    },
  });
};
