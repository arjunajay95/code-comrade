import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma.js";
import type { Prisma } from "../../src/generated/prisma/client.js";
import { createReview, createSubmission, createUser } from "./fixtures.js";
import { VERIFICATION_QUERIES } from "./verificationQueries.js";

// The audit is only worth anything if its queries can actually find what they
// are written to find. A query with a typo in a column name would come back
// empty forever and look like a healthy database. So each query is run twice
// against data this test creates: once as the suite leaves it, where it must
// not mention these rows, and once after breaking exactly the thing the query
// guards, where it must. The breakage happens inside a transaction that is
// always rolled back, so it never reaches the post-suite audit.

type Row = Record<string, unknown>;
type Tx = Prisma.TransactionClient;

class RolledBack extends Error {
  constructor(readonly rows: Row[]) {
    super("rolled back");
  }
}

const sqlOf = (id: string): string => {
  const query = VERIFICATION_QUERIES.find((candidate) => candidate.id === id);
  if (!query) throw new Error(`No verification query ${id}`);
  return query.sql;
};

const run = (id: string): Promise<Row[]> =>
  prisma.$queryRawUnsafe<Row[]>(sqlOf(id));

// Breaks something inside a transaction, runs the query there, and rolls the
// transaction back whatever happens, handing back only what the query saw.
const runAfterBreaking = async (
  id: string,
  breakIt: (tx: Tx) => Promise<void>,
): Promise<Row[]> => {
  try {
    await prisma.$transaction(async (tx) => {
      await breakIt(tx);
      throw new RolledBack(await tx.$queryRawUnsafe<Row[]>(sqlOf(id)));
    });
  } catch (err) {
    if (err instanceof RolledBack) return err.rows;
    throw err;
  }
  throw new Error("the transaction finished without rolling back");
};

const idsIn = (rows: Row[], column: string): unknown[] =>
  rows.map((row) => row[column]);

// A reviewed submission with two criteria and a complete review of it.
const reviewed = async () => {
  const author = await createUser();
  const reviewer = await createUser();
  const submission = await createSubmission(author.id, {
    criteria: ["Readability", "Structure"],
  });
  const review = await createReview(submission, reviewer.id, [4, 5]);
  return { author, reviewer, submission, review };
};

describe("the verification queries", () => {
  it("are exactly the five the suite audits: V-Q1 to V-Q4 and V-Q7", () => {
    expect(VERIFICATION_QUERIES.map((query) => query.id)).toEqual([
      "V-Q1",
      "V-Q2",
      "V-Q3",
      "V-Q4",
      "V-Q7",
    ]);
  });

  it("V-Q1 finds a user whose karma is not KARMA_PER_REVIEW times their reviews", async () => {
    const { reviewer } = await reviewed();
    expect(idsIn(await run("V-Q1"), "id")).not.toContain(reviewer.id);

    const rows = await runAfterBreaking("V-Q1", async (tx) => {
      await tx.$executeRaw`UPDATE "User" SET karma = karma + 1 WHERE id = ${reviewer.id}`;
    });

    expect(idsIn(rows, "id")).toContain(reviewer.id);
  });

  it("V-Q1 also finds karma that was never paid for a review that exists", async () => {
    const { reviewer } = await reviewed();

    const rows = await runAfterBreaking("V-Q1", async (tx) => {
      await tx.$executeRaw`UPDATE "User" SET karma = 0 WHERE id = ${reviewer.id}`;
    });

    expect(idsIn(rows, "id")).toContain(reviewer.id);
  });

  it("V-Q2 finds a review written by the submission's own author", async () => {
    const { author, submission } = await reviewed();
    const honest = await prisma.review.findMany({
      where: { submissionId: submission.id },
      select: { id: true },
    });
    const cleanIds = idsIn(await run("V-Q2"), "id");
    for (const review of honest) expect(cleanIds).not.toContain(review.id);

    let selfReviewId: number | undefined;
    const rows = await runAfterBreaking("V-Q2", async (tx) => {
      const [inserted] = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO "Review" (feedback, "reviewerId", "submissionId")
        VALUES ('A review of my own work.', ${author.id}, ${submission.id})
        RETURNING id`;
      selfReviewId = inserted?.id;
    });

    expect(selfReviewId).toBeDefined();
    expect(idsIn(rows, "id")).toContain(selfReviewId);
  });

  it("V-Q3 finds a review that is missing a rating", async () => {
    const { submission, review } = await reviewed();
    expect(idsIn(await run("V-Q3"), "review_id")).not.toContain(review.id);

    const rows = await runAfterBreaking("V-Q3", async (tx) => {
      const criterion = submission.criteria[0];
      if (!criterion) throw new Error("the fixture made no criteria");
      await tx.$executeRaw`
        DELETE FROM "CriterionRating"
        WHERE "reviewId" = ${review.id} AND "criterionId" = ${criterion.id}`;
    });

    expect(idsIn(rows, "review_id")).toContain(review.id);
  });

  it("V-Q4 finds a rating whose criterion belongs to a different submission", async () => {
    const { author, submission, review } = await reviewed();
    const elsewhere = await createSubmission(author.id, {
      criteria: ["Elsewhere"],
    });
    const rated = submission.criteria[0];
    const foreign = elsewhere.criteria[0];
    if (!rated || !foreign) throw new Error("the fixture made no criteria");
    const rating = await prisma.criterionRating.findFirstOrThrow({
      where: { reviewId: review.id, criterionId: rated.id },
      select: { id: true },
    });
    expect(idsIn(await run("V-Q4"), "id")).not.toContain(rating.id);

    const rows = await runAfterBreaking("V-Q4", async (tx) => {
      await tx.$executeRaw`
        UPDATE "CriterionRating" SET "criterionId" = ${foreign.id}
        WHERE id = ${rating.id}`;
    });

    expect(idsIn(rows, "id")).toContain(rating.id);
  });

  it("V-Q7 finds a stored URL that no longer matches its owner and repository", async () => {
    const { submission } = await reviewed();
    expect(idsIn(await run("V-Q7"), "id")).not.toContain(submission.id);

    const rows = await runAfterBreaking("V-Q7", async (tx) => {
      await tx.$executeRaw`
        UPDATE "Submission" SET "githubUrl" = 'https://evil.example/x/y'
        WHERE id = ${submission.id}`;
    });

    expect(idsIn(rows, "id")).toContain(submission.id);
  });

  it("leave nothing behind: the breakage was rolled back", async () => {
    const { reviewer, review, submission } = await reviewed();

    await runAfterBreaking("V-Q1", async (tx) => {
      await tx.$executeRaw`UPDATE "User" SET karma = 999 WHERE id = ${reviewer.id}`;
      await tx.$executeRaw`UPDATE "Submission" SET "githubUrl" = 'x' WHERE id = ${submission.id}`;
      await tx.$executeRaw`DELETE FROM "CriterionRating" WHERE "reviewId" = ${review.id}`;
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: reviewer.id },
      select: { karma: true },
    });
    const row = await prisma.submission.findUniqueOrThrow({
      where: { id: submission.id },
      select: { githubUrl: true, githubOwner: true, githubRepo: true },
    });
    expect(user.karma).toBe(2);
    expect(row.githubUrl).toBe(
      `https://github.com/${row.githubOwner}/${row.githubRepo}`,
    );
    expect(
      await prisma.criterionRating.count({ where: { reviewId: review.id } }),
    ).toBe(2);
  });
});
