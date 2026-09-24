import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
  constructor(message: string, code: string) {
    super(message, 409, code);
  }
}
