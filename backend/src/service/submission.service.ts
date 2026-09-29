import { NotFoundError } from "../errors/index.js";
import { submissionRepository } from "../repository/submission.repository.js";

type DetailRow = NonNullable<
  Awaited<ReturnType<typeof submissionRepository.findDetailById>>
>;

// Mean of the given ratings, rounded to two decimals, or null when there are
// none, so the client never has to guess whether 0 means "no ratings".
const average = (values: number[]): number | null =>
  values.length === 0
    ? null
    : Math.round(
        (values.reduce((sum, v) => sum + v, 0) / values.length) * 100,
      ) / 100;

// Built field by field, so nothing added to the query later reaches the
// response unless it is added here on purpose.
const toSubmissionDetail = (row: DetailRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  githubUrl: row.githubUrl,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  // D-14: derived on every read, never stored.
  status: row._count.reviews === 0 ? "PENDING" : "REVIEWED",
  author: { username: row.author.username, karma: row.author.karma },
  technologies: row.technologies,
  criteria: row.criteria.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    averageRating: average(
      row.reviews.flatMap((review) =>
        review.ratings
          .filter((r) => r.criterionId === criterion.id)
          .map((r) => r.rating),
      ),
    ),
  })),
  reviewCount: row._count.reviews,
  reviews: row.reviews.map((review) => ({
    id: review.id,
    feedback: review.feedback,
    createdAt: review.createdAt,
    reviewer: review.reviewer.username,
    ratings: review.ratings.map((r) => ({
      criterionId: r.criterionId,
      rating: r.rating,
    })),
  })),
  // Absent until Phase 7 fetches it, and possibly absent for good if a
  // GitHub fetch fails. null, never a half-filled object.
  repository: row.repoSnapshot
    ? {
        stars: row.repoSnapshot.stars,
        primaryLanguage: row.repoSnapshot.primaryLanguage,
        lastPushedAt: row.repoSnapshot.lastPushedAt,
        fetchedAt: row.repoSnapshot.fetchedAt,
      }
    : null,
});

export const submissionService = {
  async getById(id: number) {
    const row = await submissionRepository.findDetailById(id);
    if (!row) {
      throw new NotFoundError("Submission not found", "NOT_FOUND");
    }
    return toSubmissionDetail(row);
  },
};
