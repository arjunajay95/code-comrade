// The production demo seed (DATABASE_SCHEMA_REFERENCE §6, QA_AND_DEPLOYMENT
// §5.7). Separate from the development seed, which never runs against
// production.
//
// - Additive and idempotent: it only creates what is missing, and never
//   modifies or deletes a row. A second run creates nothing.
// - Guarded: it refuses to run unless DEMO_SEED_TARGET names the database
//   host it is about to write to.
// - Demo users are marked as demo in their usernames, bios and clerkIds. A
//   demo_ clerkId can never match a real Clerk id, which starts with user_.
// - Submissions feature real open source repositories, so every repository
//   link on a live page works. Descriptions say so, and never present a demo
//   user as the author of the project.
// - Ends with the V-Q1 to V-Q8 self-check.
//
// Run manually, never in CI or at startup:
//   $env:DATABASE_URL = <target database>
//   $env:DEMO_SEED_TARGET = <that database's host>
//   npx tsx prisma/seedDemo.ts

// Loads backend/.env for the other variables. A variable already set in the
// session, such as DATABASE_URL pointing at the target, takes precedence.
try {
  process.loadEnvFile();
} catch {
  // No .env file.
}

// Imported after the environment is loaded, since env.ts validates it the
// moment it is first imported.
const { env } = await import("../src/config/env.js");
const { prisma, pool } = await import("../src/config/prisma.js");
const { KARMA_PER_REVIEW } = await import("../src/config/constants.js");
const { selfCheck } = await import("./selfCheck.js");
const { required } = await import("./seedHelpers.js");

// ---------------------------------------------------------------------------
// Target guard
// ---------------------------------------------------------------------------

const targetHost = new URL(env.DATABASE_URL).hostname;

if (process.env.DEMO_SEED_TARGET !== targetHost) {
  process.stderr.write(
    `Refusing to run. This would write to "${targetHost}".\n` +
      `Set DEMO_SEED_TARGET to exactly that host to confirm.\n`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_TECHNOLOGIES = [
  "react",
  "nextjs",
  "typescript",
  "javascript",
  "tailwindcss",
  "zustand",
  "nodejs",
  "express",
  "postgresql",
  "prisma",
  "python",
  "django",
  "fastapi",
  "docker",
  "kubernetes",
  "go",
] as const;

type Tech = (typeof DEMO_TECHNOLOGIES)[number];

interface DemoUser {
  clerkId: string;
  username: string;
  bio: string;
  stack: Tech[];
}

// Contrasting stacks, so the personalized feed visibly differs between them.
const DEMO_USERS: DemoUser[] = [
  {
    clerkId: "demo_seed_1",
    username: "demo_frontend",
    bio: "Demonstration account. Frontend stack.",
    stack: ["react", "nextjs", "typescript", "tailwindcss"],
  },
  {
    clerkId: "demo_seed_2",
    username: "demo_backend",
    bio: "Demonstration account. Backend stack.",
    stack: ["nodejs", "express", "postgresql", "prisma"],
  },
  {
    clerkId: "demo_seed_3",
    username: "demo_fullstack",
    bio: "Demonstration account. Full stack.",
    stack: ["react", "typescript", "nodejs", "postgresql"],
  },
  {
    clerkId: "demo_seed_4",
    username: "demo_python",
    bio: "Demonstration account. Python stack.",
    stack: ["python", "django", "fastapi", "postgresql"],
  },
  {
    clerkId: "demo_seed_5",
    username: "demo_devops",
    bio: "Demonstration account. Infrastructure stack.",
    stack: ["docker", "kubernetes", "go"],
  },
  {
    clerkId: "demo_seed_6",
    username: "demo_reviewer",
    bio: "Demonstration account. JavaScript generalist.",
    stack: ["javascript", "react", "express"],
  },
];

interface DemoSubmission {
  author: string;
  owner: string;
  repo: string;
  title: string;
  description: string;
  ageHours: number;
  tags: Tech[];
  criteria: string[];
}

// The same seven age offsets as the development seed, so recency decay is
// visible. Ages are measured from the first run and never change after it.
const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    author: "demo_frontend",
    owner: "vercel",
    repo: "next.js",
    title: "Next.js",
    description:
      "Demo submission featuring the open source Next.js project, the React framework for full stack web applications.",
    ageHours: 0,
    tags: ["nextjs", "react", "typescript"],
    criteria: ["Code readability", "Component structure"],
  },
  {
    author: "demo_backend",
    owner: "expressjs",
    repo: "express",
    title: "Express",
    description:
      "Demo submission featuring the open source Express project, a minimal and flexible web framework for Node.js.",
    ageHours: 6,
    tags: ["nodejs", "express", "javascript"],
    criteria: ["API design", "Error handling", "Test coverage"],
  },
  {
    author: "demo_fullstack",
    owner: "supabase",
    repo: "supabase",
    title: "Supabase",
    description:
      "Demo submission featuring the open source Supabase project, a Postgres development platform.",
    ageHours: 24,
    tags: ["postgresql", "typescript", "react", "nextjs"],
    criteria: ["Code readability", "Database design", "Performance"],
  },
  {
    author: "demo_python",
    owner: "django",
    repo: "django",
    title: "Django",
    description:
      "Demo submission featuring the open source Django project, a high-level Python web framework.",
    ageHours: 48,
    tags: ["python", "django"],
    criteria: ["Code readability", "Documentation"],
  },
  {
    author: "demo_devops",
    owner: "docker",
    repo: "compose",
    title: "Docker Compose",
    description:
      "Demo submission featuring the open source Docker Compose project, for defining and running multi-container applications.",
    ageHours: 72,
    tags: ["docker", "go"],
    criteria: ["Configuration clarity", "Reliability"],
  },
  {
    author: "demo_reviewer",
    owner: "vitejs",
    repo: "vite",
    title: "Vite",
    description:
      "Demo submission featuring the open source Vite project, a frontend build tool with a fast development server.",
    ageHours: 96,
    tags: ["javascript", "typescript", "nodejs"],
    criteria: ["Performance", "Code readability"],
  },
  {
    author: "demo_frontend",
    owner: "pmndrs",
    repo: "zustand",
    title: "Zustand",
    description:
      "Demo submission featuring the open source Zustand project, a small state management library for React.",
    ageHours: 168,
    tags: ["react", "typescript", "zustand"],
    criteria: ["State management", "Code readability", "Performance"],
  },
  {
    author: "demo_backend",
    owner: "prisma",
    repo: "prisma",
    title: "Prisma",
    description:
      "Demo submission featuring the open source Prisma project, a TypeScript ORM for Node.js.",
    ageHours: 0,
    tags: ["prisma", "typescript", "nodejs", "postgresql"],
    criteria: [
      "API design",
      "Database design",
      "Test coverage",
      "Documentation",
    ],
  },
  {
    author: "demo_fullstack",
    owner: "tanstack",
    repo: "query",
    title: "TanStack Query",
    description:
      "Demo submission featuring the open source TanStack Query project, for fetching, caching and updating server state.",
    ageHours: 6,
    tags: ["react", "typescript"],
    criteria: ["Code readability", "API design"],
  },
  {
    author: "demo_python",
    owner: "fastapi",
    repo: "fastapi",
    title: "FastAPI",
    description:
      "Demo submission featuring the open source FastAPI project, a Python web framework for building APIs.",
    ageHours: 24,
    tags: ["python", "fastapi"],
    criteria: ["API design", "Documentation"],
  },
  {
    author: "demo_devops",
    owner: "kubernetes",
    repo: "kubernetes",
    title: "Kubernetes",
    description:
      "Demo submission featuring the open source Kubernetes project, a system for managing containerized applications.",
    ageHours: 48,
    tags: ["go", "docker", "kubernetes"],
    criteria: ["Reliability", "Documentation"],
  },
  {
    author: "demo_reviewer",
    owner: "nestjs",
    repo: "nest",
    title: "NestJS",
    description:
      "Demo submission featuring the open source NestJS project, a framework for server-side Node.js applications.",
    ageHours: 72,
    tags: ["nodejs", "typescript", "express"],
    criteria: ["Code readability", "Component structure", "Performance"],
  },
  {
    author: "demo_frontend",
    owner: "tailwindlabs",
    repo: "tailwindcss",
    title: "Tailwind CSS",
    description:
      "Demo submission featuring the open source Tailwind CSS project, a utility-first CSS framework.",
    ageHours: 96,
    tags: ["tailwindcss", "typescript"],
    criteria: ["Code readability", "Test coverage"],
  },
  {
    author: "demo_backend",
    owner: "colinhacks",
    repo: "zod",
    title: "Zod",
    description:
      "Demo submission featuring the open source Zod project, TypeScript-first schema validation.",
    ageHours: 168,
    tags: ["typescript", "nodejs"],
    criteria: ["API design", "Test coverage", "Documentation"],
  },
  {
    author: "demo_fullstack",
    owner: "trpc",
    repo: "trpc",
    title: "tRPC",
    description:
      "Demo submission featuring the open source tRPC project, for end-to-end typesafe APIs.",
    ageHours: 0,
    tags: ["typescript", "react", "nodejs"],
    criteria: ["API design", "Code readability", "Documentation"],
  },
];

interface DemoReview {
  submissionIndex: number;
  reviewer: string;
  feedback: string;
}

// Submission 3 (Django) is left unreviewed, the PENDING state the feed
// needs to show. Submission 0 (Next.js) gets three. No review is ever by the
// submission's own author (V-Q2), and no reviewer reviews a submission twice.
const DEMO_REVIEWS: DemoReview[] = [
  {
    submissionIndex: 0,
    reviewer: "demo_backend",
    feedback: "Clear separation between routing and rendering.",
  },
  {
    submissionIndex: 0,
    reviewer: "demo_fullstack",
    feedback: "Well documented, easy to find your way around.",
  },
  {
    submissionIndex: 0,
    reviewer: "demo_python",
    feedback: "Approachable even from outside the JavaScript world.",
  },
  {
    submissionIndex: 1,
    reviewer: "demo_frontend",
    feedback: "Small core, easy to reason about.",
  },
  {
    submissionIndex: 1,
    reviewer: "demo_devops",
    feedback: "Error handling paths are clear.",
  },
  {
    submissionIndex: 2,
    reviewer: "demo_reviewer",
    feedback: "Database access patterns are consistent.",
  },
  {
    submissionIndex: 4,
    reviewer: "demo_backend",
    feedback: "Configuration model is straightforward.",
  },
  {
    submissionIndex: 5,
    reviewer: "demo_fullstack",
    feedback: "Fast feedback loop during development.",
  },
  {
    submissionIndex: 5,
    reviewer: "demo_python",
    feedback: "Plugin boundaries are well defined.",
  },
  {
    submissionIndex: 6,
    reviewer: "demo_devops",
    feedback: "Minimal API, easy to adopt.",
  },
  {
    submissionIndex: 7,
    reviewer: "demo_frontend",
    feedback: "The schema-first approach reads cleanly.",
  },
  {
    submissionIndex: 7,
    reviewer: "demo_reviewer",
    feedback: "Generated types remove a lot of guesswork.",
  },
  {
    submissionIndex: 8,
    reviewer: "demo_python",
    feedback: "Caching behaviour is explained well.",
  },
  {
    submissionIndex: 9,
    reviewer: "demo_backend",
    feedback: "Type hints make the API self-describing.",
  },
  {
    submissionIndex: 10,
    reviewer: "demo_fullstack",
    feedback: "Thorough documentation for a large codebase.",
  },
  {
    submissionIndex: 11,
    reviewer: "demo_frontend",
    feedback: "Module structure is consistent throughout.",
  },
  {
    submissionIndex: 11,
    reviewer: "demo_backend",
    feedback: "Dependency injection is easy to follow.",
  },
  {
    submissionIndex: 12,
    reviewer: "demo_python",
    feedback: "Test suite covers the edge cases well.",
  },
  {
    submissionIndex: 13,
    reviewer: "demo_devops",
    feedback: "Error messages are precise and useful.",
  },
  {
    submissionIndex: 13,
    reviewer: "demo_reviewer",
    feedback: "Schema composition feels natural.",
  },
  {
    submissionIndex: 14,
    reviewer: "demo_frontend",
    feedback: "End-to-end types are a real productivity gain.",
  },
];

// A fixed, repeating sequence rather than random ratings, so every run
// produces the same data.
const RATING_CYCLE = [5, 4, 5, 3, 4] as const;

const ratingsFor = (count: number, reviewIndex: number): number[] =>
  Array.from(
    { length: count },
    (_, i) => RATING_CYCLE[(reviewIndex + i) % RATING_CYCLE.length],
  );

const HOUR_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const now = Date.now();
  const created = { technologies: 0, users: 0, submissions: 0, reviews: 0 };

  // Technologies: create any that are missing.
  const techIds = new Map<string, number>();
  for (const name of DEMO_TECHNOLOGIES) {
    let tech = await prisma.technology.findUnique({
      where: { name },
      select: { id: true },
    });
    if (!tech) {
      tech = await prisma.technology.create({
        data: { name },
        select: { id: true },
      });
      created.technologies++;
    }
    techIds.set(name, tech.id);
  }
  const connectTags = (names: readonly Tech[]) =>
    names.map((name) => ({
      id: required(techIds.get(name), `technology ${name}`),
    }));

  // Users: matched on clerkId. An existing demo user is left exactly as is.
  const userIds = new Map<string, number>();
  for (const u of DEMO_USERS) {
    let user = await prisma.user.findUnique({
      where: { clerkId: u.clerkId },
      select: { id: true },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: u.clerkId,
          username: u.username,
          bio: u.bio,
          technologies: { connect: connectTags(u.stack) },
        },
        select: { id: true },
      });
      created.users++;
    }
    userIds.set(u.username, user.id);
  }

  // Submissions: matched on author and repository URL, since submissions
  // have no other unique key.
  const submissions: { id: number; createdAt: Date; criteriaIds: number[] }[] =
    [];
  for (const s of DEMO_SUBMISSIONS) {
    const authorId = required(userIds.get(s.author), `user ${s.author}`);
    const githubUrl = `https://github.com/${s.owner}/${s.repo}`;

    let submission = await prisma.submission.findFirst({
      where: { authorId, githubUrl },
      select: {
        id: true,
        createdAt: true,
        criteria: { select: { id: true }, orderBy: { id: "asc" } },
      },
    });

    if (!submission) {
      const createdAt = new Date(now - s.ageHours * HOUR_MS);
      submission = await prisma.submission.create({
        data: {
          title: s.title,
          description: s.description,
          githubUrl,
          githubOwner: s.owner,
          githubRepo: s.repo,
          authorId,
          createdAt,
          // Equal to createdAt, so no demo submission looks edited.
          updatedAt: createdAt,
          technologies: { connect: connectTags(s.tags) },
          criteria: { create: s.criteria.map((label) => ({ label })) },
        },
        select: {
          id: true,
          createdAt: true,
          criteria: { select: { id: true }, orderBy: { id: "asc" } },
        },
      });
      created.submissions++;
    }

    submissions.push({
      id: submission.id,
      createdAt: submission.createdAt,
      criteriaIds: submission.criteria.map((c) => c.id),
    });
  }

  // Reviews: matched on the (reviewer, submission) unique pair (INV-2).
  for (const [index, r] of DEMO_REVIEWS.entries()) {
    const submission = submissions[r.submissionIndex];
    if (!submission)
      throw new Error(`No demo submission at index ${r.submissionIndex}`);
    const reviewerId = required(userIds.get(r.reviewer), `user ${r.reviewer}`);

    const existing = await prisma.review.findUnique({
      where: {
        reviewerId_submissionId: { reviewerId, submissionId: submission.id },
      },
      select: { id: true },
    });
    if (existing) continue;

    const ratings = ratingsFor(submission.criteriaIds.length, index);
    await prisma.review.create({
      data: {
        feedback: r.feedback,
        reviewerId,
        submissionId: submission.id,
        // A little after the submission was posted, and never in the future.
        createdAt: new Date(
          Math.min(now, submission.createdAt.getTime() + 2 * HOUR_MS),
        ),
        ratings: {
          create: submission.criteriaIds.map((criterionId, i) => ({
            criterionId,
            rating: required(ratings[i], `rating ${i} for review ${index}`),
          })),
        },
      },
    });
    created.reviews++;
  }

  // Karma: derived from the reviews each demo user has written, never typed
  // in (D-18). Updated only when it differs, so a second run writes nothing.
  for (const userId of userIds.values()) {
    const reviewCount = await prisma.review.count({
      where: { reviewerId: userId },
    });
    const karma = reviewCount * KARMA_PER_REVIEW;
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { karma: true },
    });
    if (current?.karma !== karma) {
      await prisma.user.update({
        where: { id: userId },
        data: { karma },
        select: { id: true },
      });
    }
  }

  console.log(
    `Demo seed complete on ${targetHost}. Created ${created.technologies} technologies, ` +
      `${created.users} users, ${created.submissions} submissions, ${created.reviews} reviews.`,
  );
}

try {
  await main();
  await selfCheck();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
