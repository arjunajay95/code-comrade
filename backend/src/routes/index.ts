import { healthRoutes } from "./health.routes.js";
import { mountRoutes } from "./registry.js";
import { technologyRoutes } from "./technology.routes.js";
import { userRoutes } from "./user.routes.js";

// Every /api/v1 feature is listed here. app.ts mounts the result once, so
// adding a feature never means touching the global middleware chain.
export const apiRouter = mountRoutes([
  healthRoutes,
  userRoutes,
  technologyRoutes,
]);
