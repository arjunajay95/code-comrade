import { submissionController } from "../controller/submission.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import {
  createSubmissionSchema,
  getSubmissionSchema,
} from "../models/submission.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";

export const submissionRoutes = createRouter("/submissions");

// The write limiter sits after requireAuth, so anonymous traffic cannot spend
// the sensitive budget (D-19). The idempotency middleware joins the chain
// between the limiter and validate when it is built.
submissionRoutes.post(
  "/",
  requireAuth,
  writeLimiter,
  validate(createSubmissionSchema),
  catchAsync(submissionController.create),
);

submissionRoutes.get(
  "/:id",
  validate(getSubmissionSchema),
  catchAsync(submissionController.getById),
);
