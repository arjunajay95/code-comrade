import { Router } from "express";
import { userController } from "../controller/user.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validate.js";
import { catchAsync } from "../utils/catchAsync.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";
import { getMeSchema, updateMeSchema } from "../models/user.schemas.js";

export const userRouter = Router();

// /me routes must be registered before /:username, which comes later in
// this phase. Express matches in order, so /:username registered first
// would swallow /me as a username.
userRouter.get(
  "/me",
  requireAuth,
  validate(getMeSchema),
  catchAsync(userController.getMe),
);

userRouter.patch(
  "/me",
  requireAuth,
  writeLimiter,
  validate(updateMeSchema),
  catchAsync(userController.updateMe),
);
