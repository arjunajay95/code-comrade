import { createRouter } from "./registry.js";
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

export const userRoutes = createRouter("/users");

// /me routes must be registered before /:username, which comes later in
// this phase. Express matches in order, so /:username registered first
// would swallow /me as a username.
userRoutes.get(
  "/me",
  requireAuth,
  validate(getMeSchema),
  catchAsync(userController.getMe),
);

userRoutes.patch(
  "/me",
  requireAuth,
  writeLimiter,
  validate(updateMeSchema),
  catchAsync(userController.updateMe),
);

userRoutes.get(
  "/me/submissions",
  requireAuth,
  validate(myListSchema),
  catchAsync(userController.listMySubmissions),
);
userRoutes.get(
  "/me/reviews",
  requireAuth,
  validate(myListSchema),
  catchAsync(userController.listMyReviews),
);
userRoutes.get(
  "/me/reviews-received",
  requireAuth,
  validate(myListSchema),
  catchAsync(userController.listReviewsReceived),
);

// Must stay below every /me route. Express matches in registration order,
// and /:username would otherwise capture "me" as a username.
userRoutes.get(
  "/:username",
  validate(getPublicProfileSchema),
  catchAsync(userController.getPublicProfile),
);
