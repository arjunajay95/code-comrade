import { createRouter } from "./registry.js";
import { technologyController } from "../controller/technology.controller.js";
import { validate } from "../middlewares/validate.js";
import { listTechnologiesSchema } from "../models/technology.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  CACHE_FIVE_MINUTES,
  cacheControl,
} from "../middlewares/cacheControl.js";

export const technologyRoutes = createRouter("/technologies");

technologyRoutes.get(
  "/",
  cacheControl(CACHE_FIVE_MINUTES),
  validate(listTechnologiesSchema),
  catchAsync(technologyController.list),
);
