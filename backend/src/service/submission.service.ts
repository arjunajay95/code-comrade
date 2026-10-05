import { BadRequestError, NotFoundError } from "../errors/index.js";
import type { CreateSubmissionBody } from "../models/submission.schemas.js";
import { submissionRepository } from "../repository/submission.repository.js";
import { parseGithubUrl } from "../utils/githubUrl.js";

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

  // The strict URL parser runs here and not in the schema, so a rejected URL
  // answers INVALID_REPO_URL and not VALIDATION_ERROR (D-10). The message is
  // fixed text and never repeats the submitted string back.
  async create(authorId: number, input: CreateSubmissionBody) {
    const repo = parseGithubUrl(input.githubUrl);
    if (!repo) {
      throw new BadRequestError(
        "githubUrl must be a repository URL like https://github.com/owner/repo",
        "INVALID_REPO_URL",
      );
    }

    const id = await submissionRepository.createWithCriteria({
      authorId,
      title: input.title,
      description: input.description,
      // Rebuilt from the parsed parts, never the submitted string (V-Q7).
      githubUrl: repo.url,
      githubOwner: repo.owner,
      githubRepo: repo.repo,
      criteria: input.criteria.map((criterion) => criterion.label),
      technologies: input.technologies,
    });

    // The same shape as GET /submissions/:id, so the client can show the new
    // submission without a second request.
    return submissionService.getById(id);
  },
};
