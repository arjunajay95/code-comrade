// backend/src/routes/submission.routes.ts

import { submissionController } from "../controller/submission.controller.js";
import { validate } from "../middlewares/validate.js";
import { getSubmissionSchema } from "../models/submission.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";

export const submissionRoutes = createRouter("/submissions");

// Read-only for now. The write routes arrive in next phase.
submissionRoutes.get(
  "/:id",
  validate(getSubmissionSchema),
  catchAsync(submissionController.getById),
);
