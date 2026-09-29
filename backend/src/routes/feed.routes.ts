import { feedController } from "../controller/feed.controller.js";
import { validate } from "../middlewares/validate.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import {
  personalizedFeedSchema,
  publicFeedSchema,
} from "../models/feed.schemas.js";

export const feedRoutes = createRouter("/feed");

feedRoutes.get(
  "/",
  validate(publicFeedSchema),
  catchAsync(feedController.listPublic),
);

feedRoutes.get(
  "/personalized",
  requireAuth,
  validate(personalizedFeedSchema),
  catchAsync(feedController.listPersonalized),
);
