import { userRepository } from "../repository/user.repository.js";
import { ConflictError, NotFoundError } from "../errors/index.js";
import type { UpdateMeBody } from "../models/user.schemas.js";
import { buildMeta, toSkip, type Pagination } from "../models/pagination.js";
import { reviewRepository } from "../repository/review.repository.js";
import { submissionRepository } from "../repository/submission.repository.js";

type SubmissionRow = Awaited<
  ReturnType<typeof submissionRepository.listByAuthor>
>["items"][number];
type ReviewRow = Awaited<
  ReturnType<typeof reviewRepository.listByReviewer>
>["items"][number];

// List item shapes, built field by field so nothing new in a repository
// select can reach a response unless it is added here on purpose.
const toSubmissionSummary = (row: SubmissionRow) => ({
  id: row.id,
  title: row.title,
  githubUrl: row.githubUrl,
  createdAt: row.createdAt,
  technologies: row.technologies,
  reviewCount: row._count.reviews,
});

const toReviewSummary = (row: ReviewRow) => ({
  id: row.id,
  feedback: row.feedback,
  createdAt: row.createdAt,
  ratings: row.ratings.map((r) => ({
    criterion: r.criterion.label,
    rating: r.rating,
  })),
  submission: {
    id: row.submission.id,
    title: row.submission.title,
    author: row.submission.author.username,
  },
  reviewer: row.reviewer.username,
});

export const userService = {
  async getMe(userId: number) {
    const [profile, reviewsReceived] = await Promise.all([
      userRepository.findProfileById(userId),
      userRepository.countReviewsReceived(userId),
    ]);

    // requireAuth guarantees the row existed moments ago, so this only
    // happens if it was deleted in between.
    if (!profile) {
      throw new NotFoundError("User not found", "NOT_FOUND");
    }

    const { _count, ...rest } = profile;
    return {
      ...rest,
      stats: {
        submissions: _count.submissions,
        reviewsGiven: _count.reviews,
        reviewsReceived,
      },
    };
  },

  async updateMe(userId: number, changes: UpdateMeBody) {
    const updated = await userRepository.updateProfile(userId, changes);
    if (!updated) {
      throw new ConflictError("That username is already taken", "CONFLICT");
    }

    // Returns the same shape as GET /users/me, so the client can replace its
    // cached profile with the response directly.
    return userService.getMe(userId);
  },

  // Public view of any user. Built field by field, rather than by removing
  // fields from the database row, so a field added to the profile query
  // later can never reach the public response by accident.
  async getPublicProfile(username: string) {
    const profile = await userRepository.findProfileByUsername(username);
    if (!profile) {
      throw new NotFoundError("User not found", "NOT_FOUND");
    }

    const reviewsReceived = await userRepository.countReviewsReceived(
      profile.id,
    );

    return {
      username: profile.username,
      bio: profile.bio,
      karma: profile.karma,
      createdAt: profile.createdAt,
      technologies: profile.technologies,
      stats: {
        submissions: profile._count.submissions,
        reviewsGiven: profile._count.reviews,
        reviewsReceived,
      },
    };
  },

  async listMySubmissions(userId: number, pagination: Pagination) {
    const { items, total } = await submissionRepository.listByAuthor(
      userId,
      toSkip(pagination),
      pagination.limit,
    );
    return {
      data: items.map(toSubmissionSummary),
      meta: buildMeta(total, pagination),
    };
  },

  async listMyReviews(userId: number, pagination: Pagination) {
    const { items, total } = await reviewRepository.listByReviewer(
      userId,
      toSkip(pagination),
      pagination.limit,
    );
    return {
      data: items.map(toReviewSummary),
      meta: buildMeta(total, pagination),
    };
  },

  async listReviewsReceived(userId: number, pagination: Pagination) {
    const { items, total } = await reviewRepository.listReceivedByAuthor(
      userId,
      toSkip(pagination),
      pagination.limit,
    );
    return {
      data: items.map(toReviewSummary),
      meta: buildMeta(total, pagination),
    };
  },
};
