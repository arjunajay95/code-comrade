import { AppError } from "./AppError.js";

export class UnprocessableError extends AppError {
  constructor(message: string, code: string) {
    super(message, 422, code);
  }
}
