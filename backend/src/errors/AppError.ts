export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Without this, an instance thrown as AppError but caught as a plain
    // Error would fail an "instanceof AppError" check
    Object.setPrototypeOf(this, new.target.prototype);

    // Excludes this constructor itself from the stack trace, so the trace
    // points at where the error was actually thrown, not at this file.
    Error.captureStackTrace(this, this.constructor);
  }
}
