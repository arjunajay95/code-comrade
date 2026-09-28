import { healthController } from "../controller/health.controller.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";

// Public, no auth. Both paths are already excluded from the global rate
// limiter and request logging through HEALTH_PATH_PREFIX.
export const healthRoutes = createRouter("/health");

healthRoutes.get("/live", healthController.live);
healthRoutes.get("/ready", catchAsync(healthController.ready));
