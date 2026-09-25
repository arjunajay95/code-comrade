// Deterministic seed data for local development, integration test fixtures,
// and the feed demonstration (DATABASE_SCHEMA_REFERENCE §6). No randomness:
// running this against a fresh database produces identical data every time,
// which is what makes the self-check at the end meaningful rather than luck.

import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { KARMA_PER_REVIEW } from "../src/config/constants.js";
import { env } from "../src/config/env.js";

// ---------------------------------------------------------------------------
// Source data
// ---------------------------------------------------------------------------

const TECHNOLOGIES = [
  "react",
  "nextjs",
  "typescript",
  "javascript",
  "nodejs",
  "express",
  "postgresql",
  "prisma",
  "python",
  "django",
  "docker",
  "zustand",
] as const;

type TechName = (typeof TECHNOLOGIES)[number];

interface SeedUser {
  username: string;
  clerkId: string;
  stack: TechName[];
}

// The first two are the demonstration pair named explicitly in the seed
// contract. The other four exist to give submissions a real spread of
// authors and reviewers instead of two people reviewing each other forever.
const USERS: SeedUser[] = [
  {
    username: "alice_frontend",
    clerkId: "seed_user_1",
    stack: ["react", "nextjs", "typescript", "zustand"],
  },
  {
    username: "bob_backend",
    clerkId: "seed_user_2",
    stack: ["nodejs", "express", "postgresql", "prisma"],
  },
  {
    username: "carol_fullstack",
    clerkId: "seed_user_3",
    stack: ["react", "nodejs", "typescript", "postgresql"],
  },
  {
    username: "dave_pythonista",
    clerkId: "seed_user_4",
    stack: ["python", "django", "postgresql", "docker"],
  },
  {
    username: "erin_devops",
    clerkId: "seed_user_5",
    stack: ["docker", "nodejs", "javascript"],
  },
  {
    username: "frank_reviewer",
    clerkId: "seed_user_6",
    stack: ["javascript", "react", "express"],
  },
];

interface SeedSubmission {
  authorUsername: string;
  title: string;
  description: string;
  owner: string;
  repo: string;
  ageHours: number;
  tags: TechName[];
  criteria: string[];
}

// Ages are the seven fixed offsets DATABASE_SCHEMA_REFERENCE §6 specifies.
// Reusing them across submissions is what makes recency decay visible once
// the feed is built: rows share an age and authors share tags on purpose,
// so ranking differences come from the algorithm, not from every row being
// artificially unique.
const SUBMISSIONS: SeedSubmission[] = [
  {
    authorUsername: "alice_frontend",
    title: "Dashboard UI kit",
    description:
      "A reusable dashboard component set built on React and Tailwind.",
    owner: "alice-frontend",
    repo: "dashboard-ui",
    ageHours: 0,
    tags: ["react", "nextjs", "typescript"],
    criteria: ["Code readability", "Component structure"],
  },
  {
    authorUsername: "bob_backend",
    title: "Auth service",
    description:
      "A standalone authentication microservice with refresh token rotation.",
    owner: "bob-backend",
    repo: "auth-service",
    ageHours: 6,
    tags: ["nodejs", "express", "prisma"],
    criteria: ["API design", "Error handling", "Test coverage"],
  },
  {
    authorUsername: "carol_fullstack",
    title: "Task manager",
    description: "A Kanban-style task manager with drag and drop ordering.",
    owner: "carol-fullstack",
    repo: "task-manager",
    ageHours: 24,
    tags: ["react", "nodejs", "postgresql"],
    criteria: ["Code readability", "Database design", "Performance"],
  },
  {
    authorUsername: "dave_pythonista",
    title: "ML pipeline",
    description: "A training pipeline for a tabular classification model.",
    owner: "dave-pythonista",
    repo: "ml-pipeline",
    ageHours: 48,
    tags: ["python", "django"],
    criteria: ["Code readability", "Documentation"],
  },
  {
    authorUsername: "erin_devops",
    title: "CI pipeline",
    description: "A GitHub Actions based CI setup for a multi-service repo.",
    owner: "erin-devops",
    repo: "ci-pipeline",
    ageHours: 72,
    tags: ["docker", "nodejs"],
    criteria: ["Configuration clarity", "Reliability"],
  },
  {
    authorUsername: "frank_reviewer",
    title: "Todo app",
    description: "A minimal todo list with local persistence.",
    owner: "frank-reviewer",
    repo: "todo-app",
    ageHours: 96,
    tags: ["javascript", "react"],
    criteria: ["Code readability", "UI consistency"],
  },
  {
    authorUsername: "alice_frontend",
    title: "State management demo",
    description:
      "A small demo comparing Zustand and Context for a mid-size app.",
    owner: "alice-frontend",
    repo: "state-demo",
    ageHours: 168,
    tags: ["react", "nextjs", "zustand"],
    criteria: ["State management", "Code readability", "Performance"],
  },
  {
    authorUsername: "bob_backend",
    title: "Payments API",
    description: "A payments API with idempotent charge creation.",
    owner: "bob-backend",
    repo: "payments-api",
    ageHours: 0,
    tags: ["nodejs", "express", "postgresql", "prisma"],
    criteria: ["API design", "Security", "Database design", "Test coverage"],
  },
  {
    authorUsername: "carol_fullstack",
    title: "Blog platform",
    description: "A blogging platform with Markdown posts and tags.",
    owner: "carol-fullstack",
    repo: "blog-platform",
    ageHours: 6,
    tags: ["typescript", "nodejs", "postgresql"],
    criteria: ["Code readability", "Database design"],
  },
  {
    authorUsername: "dave_pythonista",
    title: "Data scraper",
    description: "A scheduled scraper that normalizes and stores public data.",
    owner: "dave-pythonista",
    repo: "data-scraper",
    ageHours: 24,
    tags: ["python", "docker"],
    criteria: ["Error handling", "Documentation"],
  },
  {
    authorUsername: "erin_devops",
    title: "Deploy scripts",
    description: "A set of deployment scripts for a containerized service.",
    owner: "erin-devops",
    repo: "deploy-scripts",
    ageHours: 48,
    tags: ["docker", "javascript"],
    criteria: ["Configuration clarity", "Documentation"],
  },
  {
    authorUsername: "frank_reviewer",
    title: "Chat widget",
    description: "An embeddable chat widget with a lightweight backend.",
    owner: "frank-reviewer",
    repo: "chat-widget",
    ageHours: 72,
    tags: ["react", "javascript", "express"],
    criteria: ["Code readability", "Component structure", "Performance"],
  },
  {
    authorUsername: "alice_frontend",
    title: "Form validator",
    description: "A schema-driven form validation library.",
    owner: "alice-frontend",
    repo: "form-validator",
    ageHours: 96,
    tags: ["typescript", "react"],
    criteria: ["Code readability", "Test coverage"],
  },
  {
    authorUsername: "bob_backend",
    title: "Queue worker",
    description:
      "A background worker that processes a Postgres-backed job queue.",
    owner: "bob-backend",
    repo: "queue-worker",
    ageHours: 168,
    tags: ["nodejs", "prisma"],
    criteria: ["Error handling", "Reliability", "Documentation"],
  },
  {
    authorUsername: "carol_fullstack",
    title: "Notes app",
    description: "A note-taking app with full-text search.",
    owner: "carol-fullstack",
    repo: "notes-app",
    ageHours: 0,
    tags: ["react", "typescript", "nodejs", "postgresql"],
    criteria: ["Code readability", "Database design", "UI consistency"],
  },
];

interface SeedReview {
  submissionIndex: number;
  reviewerUsername: string;
  feedback: string;
}

// Submission 3 (ml-pipeline) is deliberately left with zero reviews, the
// PENDING state the feed needs to demonstrate. Submission 0 (dashboard-ui)
// deliberately gets three, the well-reviewed state. Every other pairing
// avoids self-review and never repeats a (reviewer, submission) pair, which
// is exactly what V-Q2 and the database's own unique constraint both check.
const REVIEWS: SeedReview[] = [
  {
    submissionIndex: 0,
    reviewerUsername: "bob_backend",
    feedback: "Clean component boundaries, easy to follow.",
  },
  {
    submissionIndex: 0,
    reviewerUsername: "carol_fullstack",
    feedback: "Good use of composition, a few props could be typed tighter.",
  },
  {
    submissionIndex: 0,
    reviewerUsername: "dave_pythonista",
    feedback: "Readable even outside my usual stack.",
  },
  {
    submissionIndex: 1,
    reviewerUsername: "alice_frontend",
    feedback: "Solid API shape, error handling is thorough.",
  },
  {
    submissionIndex: 1,
    reviewerUsername: "erin_devops",
    feedback: "Would like to see more coverage around token expiry.",
  },
  {
    submissionIndex: 2,
    reviewerUsername: "frank_reviewer",
    feedback: "Database access patterns are clean.",
  },
  {
    submissionIndex: 4,
    reviewerUsername: "bob_backend",
    feedback: "Pipeline is easy to reason about.",
  },
  {
    submissionIndex: 5,
    reviewerUsername: "carol_fullstack",
    feedback: "Consistent UI, nice attention to detail.",
  },
  {
    submissionIndex: 5,
    reviewerUsername: "dave_pythonista",
    feedback: "Simple and does the job well.",
  },
  {
    submissionIndex: 6,
    reviewerUsername: "erin_devops",
    feedback: "Clear explanation of the state tradeoffs.",
  },
  {
    submissionIndex: 7,
    reviewerUsername: "alice_frontend",
    feedback: "Idempotency handling looks correct.",
  },
  {
    submissionIndex: 7,
    reviewerUsername: "frank_reviewer",
    feedback: "Security posture is solid for a first pass.",
  },
  {
    submissionIndex: 8,
    reviewerUsername: "dave_pythonista",
    feedback: "Schema choices are sensible.",
  },
  {
    submissionIndex: 9,
    reviewerUsername: "bob_backend",
    feedback: "Error handling around network failures is good.",
  },
  {
    submissionIndex: 10,
    reviewerUsername: "carol_fullstack",
    feedback: "Scripts are clear and well organized.",
  },
  {
    submissionIndex: 11,
    reviewerUsername: "alice_frontend",
    feedback: "Nice encapsulation of the widget's state.",
  },
  {
    submissionIndex: 11,
    reviewerUsername: "bob_backend",
    feedback: "Backend integration is straightforward.",
  },
  {
    submissionIndex: 12,
    reviewerUsername: "dave_pythonista",
    feedback: "Validation rules are easy to extend.",
  },
  {
    submissionIndex: 13,
    reviewerUsername: "erin_devops",
    feedback: "Worker recovers cleanly from failures.",
  },
  {
    submissionIndex: 13,
    reviewerUsername: "frank_reviewer",
    feedback: "Queue handling is well thought out.",
  },
  {
    submissionIndex: 14,
    reviewerUsername: "alice_frontend",
    feedback: "Search implementation is fast and simple.",
  },
];

// A fixed, repeating sequence, not a random generator. The contract
// forbids randomness, not variation, so ratings still differ across
// reviews without needing one hand-picked array per review.
const RATING_CYCLE = [5, 4, 5, 3, 4] as const;

function ratingsFor(criteriaCount: number, reviewIndex: number): number[] {
  return Array.from(
    { length: criteriaCount },
    (_, i) => RATING_CYCLE[(reviewIndex + i) % RATING_CYCLE.length],
  );
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const now = new Date();

  const technologyByName = new Map<TechName, number>();
  for (const name of TECHNOLOGIES) {
    const tech = await prisma.technology.create({ data: { name } });
    technologyByName.set(name, tech.id);
  }

  const userByUsername = new Map<string, number>();
  for (const seedUser of USERS) {
    const user = await prisma.user.create({
      data: {
        username: seedUser.username,
        clerkId: seedUser.clerkId,
        technologies: {
          connect: seedUser.stack.map((name) => ({
            id: technologyByName.get(name)!,
          })),
        },
      },
    });
    userByUsername.set(seedUser.username, user.id);
  }

  // Criterion ids are tracked in creation order per submission, since
  // ratings below are matched to criteria by position, not by label text.
  const criteriaBySubmission: number[][] = [];
  const submissionIds: number[] = [];

  for (const s of SUBMISSIONS) {
    const submission = await prisma.submission.create({
      data: {
        title: s.title,
        description: s.description,
        githubUrl: `https://github.com/${s.owner}/${s.repo}`,
        githubOwner: s.owner,
        githubRepo: s.repo,
        authorId: userByUsername.get(s.authorUsername)!,
        createdAt: new Date(now.getTime() - s.ageHours * 60 * 60 * 1000),
        technologies: {
          connect: s.tags.map((name) => ({ id: technologyByName.get(name)! })),
        },
        criteria: {
          create: s.criteria.map((label) => ({ label })),
        },
      },
      include: { criteria: true },
    });

    submissionIds.push(submission.id);
    criteriaBySubmission.push(submission.criteria.map((c) => c.id));
  }

  const reviewCountByUsername = new Map<string, number>();

  for (const [reviewIndex, r] of REVIEWS.entries()) {
    const submissionId = submissionIds[r.submissionIndex];
    const criteriaIds = criteriaBySubmission[r.submissionIndex];
    const reviewerId = userByUsername.get(r.reviewerUsername)!;
    const ratings = ratingsFor(criteriaIds.length, reviewIndex);

    await prisma.review.create({
      data: {
        feedback: r.feedback,
        reviewerId,
        submissionId,
        ratings: {
          create: criteriaIds.map((criterionId, i) => ({
            criterionId,
            rating: ratings[i],
          })),
        },
      },
    });

    reviewCountByUsername.set(
      r.reviewerUsername,
      (reviewCountByUsername.get(r.reviewerUsername) ?? 0) + 1,
    );
  }

  // Karma is derived from the actual review count, never typed as a
  // literal number, so this stays correct even if REVIEWS above changes
  // (D-18: KARMA_PER_REVIEW arithmetic, never hardcoded).
  for (const [username, userId] of userByUsername) {
    const reviewCount = reviewCountByUsername.get(username) ?? 0;
    await prisma.user.update({
      where: { id: userId },
      data: { karma: reviewCount * KARMA_PER_REVIEW },
    });
  }

  console.log(
    `Seeded ${TECHNOLOGIES.length} technologies, ${USERS.length} users, ` +
      `${SUBMISSIONS.length} submissions, ${REVIEWS.length} reviews.`,
  );
}

// ---------------------------------------------------------------------------
// Self-check:
// Every query must return zero rows on a healthy database. A non-empty result
// here means the seed itself produced invalid data, so the script fails loudly
// instead of leaving a broken fixture in place silently.
// ---------------------------------------------------------------------------

async function selfCheck(): Promise<void> {
  const checks: { name: string; rows: unknown[] }[] = [];

  checks.push({
    name: "V-Q1 karma equation",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT u.id, u.username, u.karma, ${KARMA_PER_REVIEW} * COUNT(r.id) AS expected
      FROM "User" u
      LEFT JOIN "Review" r ON r."reviewerId" = u.id
      GROUP BY u.id
      HAVING u.karma <> ${KARMA_PER_REVIEW} * COUNT(r.id);
    `,
  });

  checks.push({
    name: "V-Q2 no self-reviews",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT r.id
      FROM "Review" r
      JOIN "Submission" s ON s.id = r."submissionId"
      WHERE s."authorId" = r."reviewerId";
    `,
  });

  checks.push({
    name: "V-Q3 rating completeness",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT r.id AS review_id
      FROM "Review" r
      JOIN "Submission" s ON s.id = r."submissionId"
      LEFT JOIN "Criterion" c ON c."submissionId" = s.id
      LEFT JOIN "CriterionRating" cr
        ON cr."reviewId" = r.id AND cr."criterionId" = c.id
      GROUP BY r.id
      HAVING COUNT(c.id) <> COUNT(cr.id);
    `,
  });

  checks.push({
    name: "V-Q4 no cross-submission ratings",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT cr.id
      FROM "CriterionRating" cr
      JOIN "Review" r ON r.id = cr."reviewId"
      JOIN "Criterion" c ON c.id = cr."criterionId"
      WHERE c."submissionId" <> r."submissionId";
    `,
  });

  checks.push({
    name: "V-Q5 tag normalization",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT id, name FROM "Technology"
      WHERE name <> lower(btrim(name));
    `,
  });

  checks.push({
    name: "V-Q6 criteria bounds",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT s.id, COUNT(c.id) AS criteria
      FROM "Submission" s
      LEFT JOIN "Criterion" c ON c."submissionId" = s.id
      GROUP BY s.id
      HAVING COUNT(c.id) < 1 OR COUNT(c.id) > 5;
    `,
  });

  checks.push({
    name: "V-Q7 repository host integrity",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT id, "githubUrl", "githubOwner", "githubRepo"
      FROM "Submission"
      WHERE "githubUrl" <> 'https://github.com/' || "githubOwner" || '/' || "githubRepo";
    `,
  });

  checks.push({
    name: "V-Q8 stranded in-flight idempotency keys",
    rows: await prisma.$queryRaw<unknown[]>`
      SELECT id, key, "createdAt"
      FROM "IdempotencyKey"
      WHERE status = 'IN_FLIGHT'
        AND "createdAt" < now() - ((${env.IDEMPOTENCY_INFLIGHT_TIMEOUT_MINUTES}::text || ' minutes')::interval);
    `,
  });

  const failures = checks.filter((c) => c.rows.length > 0);

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(
        `${f.name} failed: ${f.rows.length} row(s) returned`,
        f.rows,
      );
    }
    throw new Error(
      `Seed self-check failed: ${failures.map((f) => f.name).join(", ")}`,
    );
  }

  console.log("Self-check passed: V-Q1 through V-Q8 all returned zero rows.");
}

main()
  .then(() => selfCheck())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
