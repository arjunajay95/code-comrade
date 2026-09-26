import { Router } from "express";
import { userController } from "../controller/user.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validate.js";
import { getMeSchema } from "../models/user.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";

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
