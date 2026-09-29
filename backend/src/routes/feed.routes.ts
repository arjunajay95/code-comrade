import { feedController } from "../controller/feed.controller.js";
import { validate } from "../middlewares/validate.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import {
  personalizedFeedSchema,
  publicFeedSchema,
} from "../models/feed.schemas.js";
import { CACHE_REVALIDATE, cacheControl } from "../middlewares/cacheControl.js";

export const feedRoutes = createRouter("/feed");

feedRoutes.get(
  "/",
  cacheControl(CACHE_REVALIDATE),
  validate(publicFeedSchema),
  catchAsync(feedController.listPublic),
);

feedRoutes.get(
  "/personalized",
  requireAuth,
  validate(personalizedFeedSchema),
  catchAsync(feedController.listPersonalized),
);
