import { submissionController } from "../controller/submission.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import {
  createSubmissionSchema,
  getSubmissionSchema,
  updateSubmissionSchema,
} from "../models/submission.schemas.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createRouter } from "./registry.js";

export const submissionRoutes = createRouter("/submissions");

// The write limiter sits after requireAuth, so anonymous traffic cannot spend
// the sensitive budget (D-19). The idempotency middleware joins the chain
// between the limiter and validate when it is built, on this route and on the
// review route only.
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

// The same chain as POST without idempotency (D-29): replaying a PUT with the
// same body changes nothing. Ownership is checked in the service. There is no
// DELETE route, on this path or any other (INV-4).
submissionRoutes.put(
  "/:id",
  requireAuth,
  writeLimiter,
  validate(updateSubmissionSchema),
  catchAsync(submissionController.update),
);
