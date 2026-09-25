import { AppError } from "./AppError.js";

export class ForbiddenError extends AppError {
  constructor(message: string, code: string) {
    super(message, 403, code);
  }
}
