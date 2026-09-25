import { AppError } from "./AppError.js";

export class ServiceUnavailableError extends AppError {
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, 503, code, true, options);
  }
}
