import { createRouter } from "./registry.js";
import { technologyController } from "../controller/technology.controller.js";
import { validate } from "../middlewares/validate.js";
import { listTechnologiesSchema } from "../models/technology.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";

export const technologyRoutes = createRouter("/technologies");

technologyRoutes.get(
  "/",
  validate(listTechnologiesSchema),
  catchAsync(technologyController.list),
);
