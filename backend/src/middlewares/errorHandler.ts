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
// all four parameters, so next has to stay in the signature.
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // If part of the response already went out, a second response cannot be
  // sent. Handing off to Express's built-in handler lets it close the
  // connection cleanly instead of throwing "headers already sent".
  if (res.headersSent) {
    next(err);
    return;
  }

  const appError = toAppError(err);

  // Known, intentional errors. The message was written for the client, so
  // it is safe to return as-is.
  if (appError?.isOperational) {
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
