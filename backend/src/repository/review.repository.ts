import { KARMA_PER_REVIEW } from "../config/constants.js";
import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

// What a list needs about a review: its feedback, each rating with the
// criterion it was for, the submission it is on, and who wrote it.
const reviewSummarySelect = {
  id: true,
  feedback: true,
  createdAt: true,
  ratings: {
    select: { rating: true, criterion: { select: { label: true } } },
    orderBy: { criterionId: "asc" },
  },
  submission: {
    select: { id: true, title: true, author: { select: { username: true } } },
  },
  reviewer: { select: { username: true } },
} as const;

const newestFirst = [{ createdAt: "desc" }, { id: "desc" }] as const;

const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// Everything a new review is created from. The service has already checked
// the ratings against the submission's criteria.
export interface NewReview {
  reviewerId: number;
  submissionId: number;
  feedback: string;
  ratings: { criterionId: number; rating: number }[];
}

// What createWithKarma hands back: the stored review and the reviewer's new
// karma total, read inside the same transaction that changed it.
export interface CreatedReview {
  id: number;
  feedback: string;
  createdAt: Date;
  ratings: { criterionId: number; rating: number }[];
  reviewerKarma: number;
}

export const reviewRepository = {
  // The only code that writes the karma column (D-13). One transaction does
  // both halves, so a review and its karma exist together or not at all.
  // Returns null when the unique constraint on (reviewerId, submissionId)
  // rejects a second review of the same submission. The constraint decides,
  // never a check beforehand: two simultaneous requests cannot both pass a
  // check, and cannot both pass a constraint. Any other error propagates.
  async createWithKarma(input: NewReview): Promise<CreatedReview | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        // The increment runs first on purpose. Whichever way the review
        // insert fails, a duplicate, a rating that points at a missing
        // criterion or anything else, the rollback then undoes a real
        // increment, so the atomicity tests prove something. It also
        // means a second request for the same pair waits here on the
        // reviewer's row until the first one finishes, then fails on the
        // constraint and rolls its increment back.
        const reviewer = await tx.user.update({
          where: { id: input.reviewerId },
          data: { karma: { increment: KARMA_PER_REVIEW } },
          select: { karma: true },
        });

        const review = await tx.review.create({
          data: {
            feedback: input.feedback,
            reviewerId: input.reviewerId,
            submissionId: input.submissionId,
            ratings: {
              create: input.ratings.map((entry) => ({
                criterionId: entry.criterionId,
                rating: entry.rating,
              })),
            },
          },
          select: {
            id: true,
            feedback: true,
            createdAt: true,
            ratings: {
              select: { criterionId: true, rating: true },
              orderBy: { criterionId: "asc" },
            },
          },
        });

        return { ...review, reviewerKarma: reviewer.karma };
      });
    } catch (err) {
      if (isUniqueViolation(err)) return null;
      throw err;
    }
  },

  // Reviews this user wrote.
  async listByReviewer(reviewerId: number, skip: number, take: number) {
    const where = { reviewerId };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [...newestFirst],
        skip,
        take,
        select: reviewSummarySelect,
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },

  // Reviews other people wrote on this user's submissions.
  async listReceivedByAuthor(authorId: number, skip: number, take: number) {
    const where = { submission: { authorId } };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [...newestFirst],
        skip,
        take,
        select: reviewSummarySelect,
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },
};
