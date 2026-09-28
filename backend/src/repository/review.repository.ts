import { prisma } from "../config/prisma.js";

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

export const reviewRepository = {
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
