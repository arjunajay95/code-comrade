import { Router } from "express";
import { userController } from "../controller/user.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validate.js";
import { catchAsync } from "../utils/catchAsync.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";
import {
  getMeSchema,
  getPublicProfileSchema,
  myListSchema,
  updateMeSchema,
} from "../models/user.schemas.js";

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

userRouter.get(
  "/me/submissions",
  requireAuth,
  validate(myListSchema),
  catchAsync(userController.listMySubmissions),
);
userRouter.get(
  "/me/reviews",
  requireAuth,
  validate(myListSchema),
  catchAsync(userController.listMyReviews),
);
userRouter.get(
  "/me/reviews-received",
  requireAuth,
  validate(myListSchema),
  catchAsync(userController.listReviewsReceived),
);

// Must stay below every /me route. Express matches in registration order,
// and /:username would otherwise capture "me" as a username.
userRouter.get(
  "/:username",
  validate(getPublicProfileSchema),
  catchAsync(userController.getPublicProfile),
);
