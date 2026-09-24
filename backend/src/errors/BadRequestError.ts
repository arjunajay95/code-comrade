import { AppError } from "./AppError.js";

export class BadRequestError extends AppError {
  constructor(message: string, code: string) {
    super(message, 400, code);
  }
}
