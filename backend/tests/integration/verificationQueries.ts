import { KARMA_PER_REVIEW } from "../../src/config/constants.js";

// The verification queries from DATABASE_SCHEMA_REFERENCE section 5 that the
// integration suite runs as assertions: V-Q1 to V-Q4 and V-Q7. Each must
// return zero rows on a healthy database. V-Q5, V-Q6 and V-Q8 run in the seed
// script's self-check instead. Together these are the audit that replaces a
// ledger, and the same text is used twice: once after the whole suite, on
// everything it left behind, and once against deliberately broken data, to
// prove the queries can find what they are meant to find.

export interface VerificationQuery {
  id: string;
  description: string;
  sql: string;
}

export const VERIFICATION_QUERIES: readonly VerificationQuery[] = [
  {
    id: "V-Q1",
    description:
      "every user's karma is KARMA_PER_REVIEW times the reviews they wrote (INV-1)",
    sql: `
      SELECT u.id, u.username, u.karma, ${KARMA_PER_REVIEW} * COUNT(r.id) AS expected
      FROM "User" u
      LEFT JOIN "Review" r ON r."reviewerId" = u.id
      GROUP BY u.id
      HAVING u.karma <> ${KARMA_PER_REVIEW} * COUNT(r.id)`,
  },
  {
    id: "V-Q2",
    description: "nobody has reviewed their own submission (INV-2)",
    sql: `
      SELECT r.id
      FROM "Review" r
      JOIN "Submission" s ON s.id = r."submissionId"
      WHERE s."authorId" = r."reviewerId"`,
  },
  {
    id: "V-Q3",
    description:
      "every review rates every criterion of its submission, exactly once",
    sql: `
      SELECT r.id AS review_id
      FROM "Review" r
      JOIN "Submission" s ON s.id = r."submissionId"
      LEFT JOIN "Criterion" c ON c."submissionId" = s.id
      LEFT JOIN "CriterionRating" cr
        ON cr."reviewId" = r.id AND cr."criterionId" = c.id
      GROUP BY r.id
      HAVING COUNT(c.id) <> COUNT(cr.id)`,
  },
  {
    id: "V-Q4",
    description: "every rating's criterion belongs to the submission reviewed",
    sql: `
      SELECT cr.id
      FROM "CriterionRating" cr
      JOIN "Review" r ON r.id = cr."reviewId"
      JOIN "Criterion" c ON c.id = cr."criterionId"
      WHERE c."submissionId" <> r."submissionId"`,
  },
  {
    id: "V-Q7",
    description:
      "every stored repository URL matches its parsed owner and repository (D-31)",
    sql: `
      SELECT id, "githubUrl", "githubOwner", "githubRepo"
      FROM "Submission"
      WHERE "githubUrl" <> 'https://github.com/' || "githubOwner" || '/' || "githubRepo"`,
  },
];

// A few rows of a result, readable in a failure message. COUNT returns a
// bigint, which JSON cannot write, so it is turned into a number first.
export const describeRows = (rows: readonly unknown[]): string => {
  const shown = JSON.stringify(
    rows.slice(0, 5),
    (_key, value: unknown) =>
      typeof value === "bigint" ? Number(value) : value,
    2,
  );
  return rows.length > 5 ? `${shown}\n... and ${rows.length - 5} more` : shown;
};
