import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";
import type { CreateReviewBody } from "../models/review.schemas.js";
import { reviewRepository } from "../repository/review.repository.js";
import { submissionRepository } from "../repository/submission.repository.js";
import type { AuthUser } from "../types/express.js";

export const reviewService = {
  // The order of the checks is part of the contract. A missing submission is a
  // 404 for everyone, then self-review is a 403, then the ratings are checked
  // against the submission's criteria, so none of the later answers can be
  // used to learn something an earlier one withholds. Duplicates are not
  // checked here at all: the unique constraint on (reviewerId, submissionId)
  // decides, and the repository reports it as null.
  async create(
    submissionId: number,
    reviewer: Pick<AuthUser, "id" | "username">,
    input: CreateReviewBody,
  ) {
    const submission = await submissionRepository.findForReview(submissionId);
    if (!submission) {
      throw new NotFoundError("Submission not found", "NOT_FOUND");
    }
    if (submission.authorId === reviewer.id) {
      throw new ForbiddenError(
        "You cannot review your own submission",
        "FORBIDDEN",
      );
    }

    // Exactly the submission's criteria: none missing, none from elsewhere.
    // The schema has already rejected a criterion rated twice, so equal sizes
    // and every criterion present means the two sets are the same.
    const rated = new Set(input.ratings.map((entry) => entry.criterionId));
    const matches =
      submission.criteria.length === rated.size &&
      submission.criteria.every((criterion) => rated.has(criterion.id));
    if (!matches) {
      throw new BadRequestError(
        "ratings must include exactly one rating for each of the submission's criteria",
        "CRITERIA_MISMATCH",
      );
    }

    const created = await reviewRepository.createWithKarma({
      reviewerId: reviewer.id,
      submissionId,
      feedback: input.feedback,
      ratings: input.ratings,
    });
    if (!created) {
      throw new ConflictError(
        "You have already reviewed this submission",
        "CONFLICT",
      );
    }

    // Built field by field, so nothing added to the query later reaches the
    // response unless it is added here on purpose. reviewerKarma is the new
    // total, so the client can update its badge without a second request.
    return {
      review: {
        id: created.id,
        submissionId,
        feedback: created.feedback,
        createdAt: created.createdAt,
        reviewer: reviewer.username,
        ratings: created.ratings.map((entry) => ({
          criterionId: entry.criterionId,
          rating: entry.rating,
        })),
      },
      reviewerKarma: created.reviewerKarma,
    };
  },
};
