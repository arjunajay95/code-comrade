// DATABASE_SCHEMA_REFERENCE §5, V-Q1 through V-Q8. Every query must return
// zero rows on a healthy database. Shared by the development seed and the
// production demo seed, so both always check exactly the same invariants.
// A non-empty result throws, so a seed fails loudly instead of leaving
// broken data in place.

import { KARMA_PER_REVIEW } from "../src/config/constants.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/config/prisma.js";

export async function selfCheck(): Promise<void> {
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
      `Self-check failed: ${failures.map((f) => f.name).join(", ")}`,
    );
  }

  console.log("Self-check passed: V-Q1 through V-Q8 all returned zero rows.");
}
