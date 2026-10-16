import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";
import type {
  CreateSubmissionBody,
  UpdateSubmissionBody,
} from "../models/submission.schemas.js";
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

// The strict URL parser runs here and not in the schema, so a rejected URL
// answers INVALID_REPO_URL and not VALIDATION_ERROR (D-10). The message is
// fixed text and never repeats the submitted string back.
const parseRepoUrlOrThrow = (input: string) => {
  const repo = parseGithubUrl(input);
  if (!repo) {
    throw new BadRequestError(
      "githubUrl must be a repository URL like https://github.com/owner/repo",
      "INVALID_REPO_URL",
    );
  }
  return repo;
};

export const submissionService = {
  async getById(id: number) {
    const row = await submissionRepository.findDetailById(id);
    if (!row) {
      throw new NotFoundError("Submission not found", "NOT_FOUND");
    }
    return toSubmissionDetail(row);
  },

  async create(authorId: number, input: CreateSubmissionBody) {
    const repo = parseRepoUrlOrThrow(input.githubUrl);

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

  // Ownership lives here, on local integer ids (AUTHORIZATION_MATRIX section
  // 3). The 404 always comes before the 403, so the API never confirms a
  // submission exists to someone who may not edit it. The URL is parsed after
  // both, so a caller who may not edit learns nothing from the URL check.
  async update(id: number, userId: number, input: UpdateSubmissionBody) {
    const existing = await submissionRepository.findForEdit(id);
    if (!existing) {
      throw new NotFoundError("Submission not found", "NOT_FOUND");
    }
    if (existing.authorId !== userId) {
      throw new ForbiddenError(
        "You can only edit your own submissions",
        "FORBIDDEN",
      );
    }

    const repo = parseRepoUrlOrThrow(input.githubUrl);

    await submissionRepository.updateOwn(id, {
      title: input.title,
      description: input.description,
      githubUrl: repo.url,
      githubOwner: repo.owner,
      githubRepo: repo.repo,
      technologies: input.technologies,
      // The cached snapshot describes the old repository once the URL moves.
      clearSnapshot: repo.url !== existing.githubUrl,
    });

    return submissionService.getById(id);
  },
};
