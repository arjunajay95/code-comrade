// Builders for integration test data. Each test creates exactly what it
// needs, with generated unique names, so tests never depend on the seed, on
// each other, or on the order they run in.

import { prisma } from "../../src/config/prisma.js";

let counter = 0;

// Lowercase letters, digits and underscores only, so the result satisfies
// the username and technology name constraints.
export const unique = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export const createUser = () =>
  prisma.user.create({
    data: { clerkId: unique("test_clerk"), username: unique("u") },
  });

export const createSubmission = (
  authorId: number,
  options: {
    title?: string;
    description?: string;
    criteria?: string[];
    technologies?: string[];
    createdAt?: Date;
  } = {},
) => {
  const owner = unique("owner");
  const repo = unique("repo");

  return prisma.submission.create({
    data: {
      title: options.title ?? "Test submission",
      description:
        options.description ?? "A submission created by an integration test.",
      // Owner and repository parsed out of the URL, consistent with it, as
      // V-Q7 requires of every real submission.
      githubUrl: `https://github.com/${owner}/${repo}`,
      githubOwner: owner,
      githubRepo: repo,
      authorId,
      createdAt: options.createdAt,
      criteria: {
        create: (options.criteria ?? ["Readability"]).map((label) => ({
          label,
        })),
      },
      technologies: {
        connectOrCreate: (options.technologies ?? []).map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
    include: { criteria: { orderBy: { id: "asc" } } },
  });
};

// One rating per criterion, in criteria order, so every review is complete
// the way V-Q3 requires.
export const createReview = (
  submission: { id: number; criteria: { id: number }[] },
  reviewerId: number,
  ratings: number[],
  createdAt?: Date,
) =>
  prisma.review.create({
    data: {
      feedback: "Feedback from an integration test.",
      reviewerId,
      submissionId: submission.id,
      createdAt,
      ratings: {
        create: submission.criteria.map((criterion, i) => ({
          criterionId: criterion.id,
          rating: ratings[i] ?? 3,
        })),
      },
    },
  });
