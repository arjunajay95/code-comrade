import { prisma } from "../config/prisma.js";

// What a list needs about a submission. The full detail view, criteria and
// repository snapshot included, is built in Phase 4.
const submissionSummarySelect = {
  id: true,
  title: true,
  githubUrl: true,
  createdAt: true,
  technologies: { select: { id: true, name: true }, orderBy: { name: "asc" } },
  _count: { select: { reviews: true } },
} as const;

// Newest first. id breaks ties between rows created in the same
// millisecond, so paging never shows one row twice or skips one.
const newestFirst = [{ createdAt: "desc" }, { id: "desc" }] as const;

export const submissionRepository = {
  // One page of an author's submissions, plus the total count for the meta
  // object. Both queries run at once.
  async listByAuthor(authorId: number, skip: number, take: number) {
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where: { authorId },
        orderBy: [...newestFirst],
        skip,
        take,
        select: submissionSummarySelect,
      }),
      prisma.submission.count({ where: { authorId } }),
    ]);
    return { items, total };
  },
};
