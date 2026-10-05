import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface FeedFilters {
  search?: string;
  technologies?: string[];
}

// Everything a new submission is created from. The service has already run
// the URL parser, so the owner and repository arrive separately and the URL
// is the one rebuilt from them.
export interface NewSubmission {
  authorId: number;
  title: string;
  description: string;
  githubUrl: string;
  githubOwner: string;
  githubRepo: string;
  criteria: string[];
  technologies: string[];
}

// The four editable fields of an existing submission, with the URL already
// parsed. Criteria are deliberately absent: they lock at creation (INV-4).
export interface SubmissionEdit {
  title: string;
  description: string;
  githubUrl: string;
  githubOwner: string;
  githubRepo: string;
  technologies: string[];
  // True when the URL changed, so the cached repository snapshot now describes
  // a different repository and has to go (D-03).
  clearSnapshot: boolean;
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

  // The personalized feed's candidate window: the newest submissions not
  // written by the given user, in one query, with the same fields as a
  // public feed item. Excluding here, rather than after scoring, keeps the
  // window a full FEED_WINDOW of submissions the user could act on.
  listRecentWindow(size: number, excludeAuthorId: number) {
    return prisma.submission.findMany({
      where: { authorId: { not: excludeAuthorId } },
      orderBy: [...newestFirst],
      take: size,
      select: feedItemSelect,
    });
  },

  // Creates a submission, its criteria and its technology links in one
  // transaction, so a failure leaves nothing half written. Criteria are
  // created here and never again: ratings point at them by id, so they lock
  // at creation (INV-4). Returns only the new id, because the service reads
  // the row back through the one detail query.
  async createWithCriteria(input: NewSubmission): Promise<number> {
    return prisma.$transaction(async (tx) => {
      // Creates any technology that does not exist yet. skipDuplicates makes
      // this safe when two requests add the same new tag at the same moment:
      // the loser of that race just skips it (D-17). connectOrCreate would
      // look first and insert second, and could lose that race with a unique
      // violation.
      await tx.technology.createMany({
        data: input.technologies.map((name) => ({ name })),
        skipDuplicates: true,
      });

      const created = await tx.submission.create({
        data: {
          title: input.title,
          description: input.description,
          githubUrl: input.githubUrl,
          githubOwner: input.githubOwner,
          githubRepo: input.githubRepo,
          authorId: input.authorId,
          criteria: { create: input.criteria.map((label) => ({ label })) },
          technologies: {
            connect: input.technologies.map((name) => ({ name })),
          },
        },
        select: { id: true },
      });

      return created.id;
    });
  },

  // Just what an edit needs to decide: who owns the submission, and which URL
  // it has now, so the service can tell whether the URL is changing.
  findForEdit(id: number) {
    return prisma.submission.findUnique({
      where: { id },
      select: { id: true, authorId: true, githubUrl: true },
    });
  },

  // What a review needs to decide: who wrote the submission, so the author
  // cannot review it, and which criteria exist, so the ratings can be
  // checked against them.
  findForReview(id: number) {
    return prisma.submission.findUnique({
      where: { id },
      select: { id: true, authorId: true, criteria: { select: { id: true } } },
    });
  },

  // Applies an edit in one transaction, so a failure leaves nothing half
  // written: the new technologies, the updated fields and the snapshot
  // deletion all happen or none of them does. Throws when the submission does
  // not exist, which rolls the whole transaction back.
  async updateOwn(id: number, edit: SubmissionEdit): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Creates any technology that does not exist yet, safe under a race for
      // the same reason as in createWithCriteria (D-17).
      await tx.technology.createMany({
        data: edit.technologies.map((name) => ({ name })),
        skipDuplicates: true,
      });

      await tx.submission.update({
        where: { id },
        data: {
          title: edit.title,
          description: edit.description,
          githubUrl: edit.githubUrl,
          githubOwner: edit.githubOwner,
          githubRepo: edit.githubRepo,
          // set replaces the whole list. Criteria are never touched: ratings
          // point at them by id.
          technologies: { set: edit.technologies.map((name) => ({ name })) },
        },
        select: { id: true },
      });

      // The one deletion in this method (D-03). The snapshot is cached
      // third-party data, not user content, and enrichment recreates it.
      // deleteMany does nothing when there is no snapshot.
      if (edit.clearSnapshot) {
        await tx.repoSnapshot.deleteMany({ where: { submissionId: id } });
      }
    });
  },
};
