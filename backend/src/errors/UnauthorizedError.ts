import { AppError } from "./AppError.js";

export class UnauthorizedError extends AppError {
  constructor(message: string, code: string) {
    super(message, 401, code);
  }
}
