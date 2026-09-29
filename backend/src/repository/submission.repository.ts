import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface FeedFilters {
  search?: string;
  technologies?: string[];
}

// Shared by the public and personalized feeds, so both return items with the
// same fields.
const feedItemSelect = {
  id: true,
  title: true,
  description: true,
  githubUrl: true,
  createdAt: true,
  author: { select: { username: true, karma: true } },
  technologies: { select: { id: true, name: true }, orderBy: { name: "asc" } },
  // D-14: the derived status comes from this count.
  _count: { select: { reviews: true } },
} as const;

const feedWhere = ({
  search,
  technologies,
}: FeedFilters): Prisma.SubmissionWhereInput => ({
  // A case-insensitive contains match, which becomes ILIKE '%term%'. Slow at
  // scale and deliberately so for now: D-33 replaces it with full-text
  // search in Phase 6, and requires measuring this version first.
  ...(search && {
    OR: [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ],
  }),
  // Any of the listed technologies.
  ...(technologies && {
    technologies: { some: { name: { in: technologies } } },
  }),
});

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

  // Everything the detail view needs, in one query. Criteria in creation
  // order, reviews newest first. No clerkId is selected anywhere (D-08).
  findDetailById(id: number) {
    return prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        githubUrl: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { username: true, karma: true } },
        technologies: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        criteria: { select: { id: true, label: true }, orderBy: { id: "asc" } },
        reviews: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            feedback: true,
            createdAt: true,
            reviewer: { select: { username: true } },
            ratings: { select: { criterionId: true, rating: true } },
          },
        },
        repoSnapshot: {
          select: {
            stars: true,
            primaryLanguage: true,
            lastPushedAt: true,
            fetchedAt: true,
          },
        },
        // D-14: the status is derived from this count.
        _count: { select: { reviews: true } },
      },
    });
  },

  // One page of the public feed, newest first, and the total for the meta
  // object. The same filter goes to both queries so the count always matches.
  async listFeed(filters: FeedFilters, skip: number, take: number) {
    const where = feedWhere(filters);
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: [...newestFirst],
        skip,
        take,
        select: feedItemSelect,
      }),
      prisma.submission.count({ where }),
    ]);
    return { items, total };
  },

  // The personalized feed's candidate window: the newest submissions, in
  // one query, with the same fields as a public feed item.
  listRecentWindow(size: number) {
    return prisma.submission.findMany({
      orderBy: [...newestFirst],
      take: size,
      select: feedItemSelect,
    });
  },
};
