import { Router } from "express";
import { healthController } from "../controller/health.controller.js";
import { catchAsync } from "../utils/catchAsync.js";

// Public, no auth. Both paths are already excluded from the global rate
// limiter and request logging through HEALTH_PATH_PREFIX.
export const healthRouter = Router();

healthRouter.get("/live", healthController.live);
healthRouter.get("/ready", catchAsync(healthController.ready));
