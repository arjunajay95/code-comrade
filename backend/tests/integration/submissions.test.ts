import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { createReview, createSubmission, createUser } from "./fixtures.js";

const app = createApp();

describe("GET /submissions/:id", () => {
  it("returns 404 for an id that does not exist", async () => {
    const res = await request(app).get("/api/v1/submissions/999999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an id that is not a positive integer", async () => {
    const res = await request(app).get("/api/v1/submissions/abc");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("shows a submission with no reviews as PENDING", async () => {
    const author = await createUser();
    const submission = await createSubmission(author.id, {
      criteria: ["Readability"],
    });

    const res = await request(app).get(`/api/v1/submissions/${submission.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.reviewCount).toBe(0);
    expect(res.body.data.reviews).toEqual([]);
    expect(res.body.data.criteria[0].averageRating).toBeNull();
    expect(res.body.data.repository).toBeNull();
    expect(res.body.data.author.username).toBe(author.username);
  });

  it("shows a reviewed submission with ratings averaged per criterion", async () => {
    const author = await createUser();
    const first = await createUser();
    const second = await createUser();
    const submission = await createSubmission(author.id, {
      criteria: ["Readability", "Structure"],
    });

    await createReview(
      submission,
      first.id,
      [4, 5],
      new Date("2026-10-01T00:00:00Z"),
    );
    await createReview(
      submission,
      second.id,
      [5, 3],
      new Date("2026-10-02T00:00:00Z"),
    );

    const res = await request(app).get(`/api/v1/submissions/${submission.id}`);
    const data = res.body.data;

    expect(res.status).toBe(200);
    expect(data.status).toBe("REVIEWED");
    expect(data.reviewCount).toBe(2);
    // Readability: (4 + 5) / 2. Structure: (5 + 3) / 2.
    expect(
      data.criteria.map((c: { averageRating: number }) => c.averageRating),
    ).toEqual([4.5, 4]);
    // Newest review first.
    expect(data.reviews.map((r: { reviewer: string }) => r.reviewer)).toEqual([
      second.username,
      first.username,
    ]);
    // D-08: no Clerk identifier anywhere in the body.
    expect(JSON.stringify(res.body)).not.toMatch(/clerk/i);
  });

  it("includes the repository snapshot when one exists", async () => {
    const author = await createUser();
    const submission = await createSubmission(author.id);
    await prisma.repoSnapshot.create({
      data: {
        submissionId: submission.id,
        stars: 42,
        primaryLanguage: "TypeScript",
      },
    });

    const res = await request(app).get(`/api/v1/submissions/${submission.id}`);

    expect(res.body.data.repository).toMatchObject({
      stars: 42,
      primaryLanguage: "TypeScript",
    });
  });
});
