import { z } from "zod";
import { MAX_DB_INT, submissionIdParams } from "./submission.schemas.js";
import { requestSchema } from "./requestSchema.js";

// Product limits for a review. Held here and nowhere else: the only database
// backstop is chk_rating_range, because the rest are not integrity rules.
export const FEEDBACK_MIN_LENGTH = 20;
export const FEEDBACK_MAX_LENGTH = 2000;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATINGS_MIN_COUNT = 1;
export const RATINGS_MAX_COUNT = 5;

// A whole number, never a numeric string: a client that sends "4" has a bug
// worth surfacing, and coercion would hide it.
const ratingEntry = z
  .object({
    criterionId: z.number().int().positive().max(MAX_DB_INT),
    rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  })
  .strict();

// The shape is checked here: 1 to 5 entries with no criterion repeated. That
// the ids are exactly the target submission's criteria cannot be known
// without loading it, so the service checks that and answers CRITERIA_MISMATCH.
const ratingsField = z
  .array(ratingEntry)
  .min(RATINGS_MIN_COUNT)
  .max(RATINGS_MAX_COUNT)
  .refine(
    (ratings) =>
      new Set(ratings.map((entry) => entry.criterionId)).size ===
      ratings.length,
    "Each criterion can be rated only once",
  );

// Exactly these two fields. .strict() rejects everything else, reviewerId
// and karma included: the reviewer is always the signed-in user, and karma
// is never client input (D-11).
const createReviewBody = z
  .object({
    feedback: z
      .string()
      .trim()
      .min(FEEDBACK_MIN_LENGTH)
      .max(FEEDBACK_MAX_LENGTH),
    ratings: ratingsField,
  })
  .strict();

export const createReviewSchema = requestSchema({
  params: submissionIdParams,
  body: createReviewBody,
});

export type CreateReviewBody = z.infer<typeof createReviewBody>;
