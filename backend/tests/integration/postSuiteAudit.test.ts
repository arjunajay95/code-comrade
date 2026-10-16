import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma.js";
import { VERIFICATION_QUERIES, describeRows } from "./verificationQueries.js";

// The audit that closes the integration suite. The sequencer in
// vitest.config.ts runs this file after every other one, so these queries see
// everything the workflow tests created, through the real API and through the
// fixtures, in one database. Every query must come back empty. A row here
// means some test, or some code path, produced data that breaks an invariant.

describe("the post-suite audit", () => {
  it("has the other files' data to audit", async () => {
    const [users, submissions, reviews] = await Promise.all([
      prisma.user.count(),
      prisma.submission.count(),
      prisma.review.count(),
    ]);

    // An audit of an empty database would pass for the wrong reason. If this
    // fails, the file was run on its own: run the whole integration project.
    expect(users).toBeGreaterThan(0);
    expect(submissions).toBeGreaterThan(0);
    expect(reviews).toBeGreaterThan(0);
  });

  it.each(VERIFICATION_QUERIES)("$id: $description", async ({ id, sql }) => {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);

    expect(
      rows,
      `${id} found ${rows.length} violation(s):\n${describeRows(rows)}`,
    ).toHaveLength(0);
  });
});
