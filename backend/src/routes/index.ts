import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { userRouter } from "./user.routes.js";

// Every /api/v1 route registers here. app.ts mounts this router once, so
// adding a feature never means touching the global middleware chain.
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/users", userRouter);
