import { Router } from "express";
import { technologyController } from "../controller/technology.controller.js";
import { validate } from "../middlewares/validate.js";
import { listTechnologiesSchema } from "../models/technology.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";

export const technologyRouter = Router();

technologyRouter.get(
  "/",
  validate(listTechnologiesSchema),
  catchAsync(technologyController.list),
);
