import { feedController } from "../controller/feed.controller.js";
import { validate } from "../middlewares/validate.js";
import { publicFeedSchema } from "../models/feed.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";

export const feedRoutes = createRouter("/feed");

feedRoutes.get(
  "/",
  validate(publicFeedSchema),
  catchAsync(feedController.listPublic),
);
