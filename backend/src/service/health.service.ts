import { healthRepository } from "../repository/health.repository.js";
import { ServiceUnavailableError } from "../errors/index.js";

export const healthService = {
  async checkReadiness(): Promise<void> {
    try {
      await healthRepository.pingDatabase();
    } catch (err) {
      // The raw database error rides along as the cause, so the error
      // handler can log it with the request id. It can carry connection
      // details, so it is never sent to the client.
      throw new ServiceUnavailableError(
        "Service is not ready",
        "SERVICE_UNAVAILABLE",
        {
          cause: err,
        },
      );
    }
  },
};
