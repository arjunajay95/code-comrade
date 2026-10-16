import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { KARMA_PER_REVIEW } from "../../src/config/constants.js";
import { prisma } from "../../src/config/prisma.js";
import { reviewRepository } from "../../src/repository/review.repository.js";
import { registeredRoutes } from "../../src/routes/registry.js";
import { actAs, type Actor } from "./auth.js";
import {
  createReview,
  createSubmission,
  createUser,
  unique,
} from "./fixtures.js";

// The five invariants (PROJECT_BLUEPRINT section 1.2), one group each, with the
// enforcement point named where it lives. The post-suite audit checks the
// same properties over everything the suite leaves behind. These tests check
// that each one holds when someone actively tries to break it, through the
// API where the API is the guard and at the database where the database is.

const app = createApp();

const karmaOf = async (id: number) =>
  (
    await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { karma: true },
    })
  ).karma;

const reviewBody = (submission: { criteria: { id: number }[] }) => ({
  feedback: "Clear structure, but the error handling needs another pass.",
  ratings: submission.criteria.map((criterion) => ({
    criterionId: criterion.id,
    rating: 4,
  })),
});

const postReview = (
  authorization: string,
  submissionId: number,
  body: object,
  key?: string,
) => {
  const req = request(app)
    .post(`/api/v1/submissions/${submissionId}/reviews`)
    .set("Authorization", authorization);
  if (key) req.set("Idempotency-Key", key);
  return req.send(body);
};

describe("INV-1: karma comes from reviews only, at exactly KARMA_PER_REVIEW each", () => {
  // Enforcement: the single transaction in review.repository.createWithKarma
  // (D-13), and chk_karma_nonnegative at the database.
  let author: Actor;
  let reviewer: Actor;

  beforeAll(async () => {
    author = await actAs("a");
    reviewer = await actAs("b");
  });

  it("is not minted by posting or editing a submission", async () => {
    const created = await request(app)
      .post("/api/v1/submissions")
      .set("Authorization", author.authorization)
      .send({
        title: unique("inv1"),
        description: "A submission posted to check that it earns nothing.",
        githubUrl: "https://github.com/inv-owner/inv-repo",
        criteria: [{ label: "Readability" }],
        technologies: [unique("tag")],
      });
    const edited = await request(app)
      .put(`/api/v1/submissions/${created.body.data.id as number}`)
      .set("Authorization", author.authorization)
      .send({
        title: unique("inv1"),
        description: "An edit made to check that it earns nothing.",
        githubUrl: "https://github.com/inv-owner/inv-repo",
        technologies: [unique("tag")],
      });

    expect(created.status).toBe(201);
    expect(edited.status).toBe(200);
    expect(await karmaOf(author.id)).toBe(0);
  });

  it("cannot be set through the profile, whatever is sent", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", author.authorization)
      .send({ karma: 1_000_000 });

    expect(res.status).toBe(400);
    expect(await karmaOf(author.id)).toBe(0);
  });

  it("is paid to the reviewer and to nobody else, by exactly KARMA_PER_REVIEW", async () => {
    const submission = await createSubmission(author.id);
    const authorBefore = await karmaOf(author.id);
    const reviewerBefore = await karmaOf(reviewer.id);

    const res = await postReview(
      reviewer.authorization,
      submission.id,
      reviewBody(submission),
    );

    expect(res.status).toBe(201);
    expect(res.body.data.reviewerKarma).toBe(reviewerBefore + KARMA_PER_REVIEW);
    expect(await karmaOf(reviewer.id)).toBe(reviewerBefore + KARMA_PER_REVIEW);
    expect(await karmaOf(author.id)).toBe(authorBefore);
  });

  it("is not paid for a review that was refused, whatever the reason", async () => {
    const submission = await createSubmission(author.id, {
      criteria: ["Readability", "Structure"],
    });
    const before = await karmaOf(reviewer.id);

    const missing = await postReview(
      reviewer.authorization,
      2_000_000_000,
      reviewBody(submission),
    );
    const incomplete = await postReview(reviewer.authorization, submission.id, {
      ...reviewBody(submission),
      ratings: reviewBody(submission).ratings.slice(0, 1),
    });
    const own = await postReview(
      author.authorization,
      submission.id,
      reviewBody(submission),
    );
    const invalid = await postReview(reviewer.authorization, submission.id, {});

    expect([
      missing.status,
      incomplete.status,
      own.status,
      invalid.status,
    ]).toEqual([404, 400, 403, 400]);
    expect(await karmaOf(reviewer.id)).toBe(before);
  });

  it("adds up: a mixed history ends at KARMA_PER_REVIEW times the reviews written", async () => {
    const writer = await actAs("c");
    const first = await createSubmission(author.id);
    const second = await createSubmission(author.id);
    await postReview(writer.authorization, first.id, reviewBody(first));
    await postReview(writer.authorization, first.id, reviewBody(first));
    await postReview(writer.authorization, second.id, reviewBody(second));

    const reviews = await prisma.review.count({
      where: { reviewerId: writer.id },
    });

    expect(reviews).toBe(2);
    expect(await karmaOf(writer.id)).toBe(KARMA_PER_REVIEW * reviews);
  });

  it("cannot go negative: the database refuses it", async () => {
    const user = await createUser();

    await expect(
      prisma.user.update({ where: { id: user.id }, data: { karma: -1 } }),
    ).rejects.toThrow();
    expect(await karmaOf(user.id)).toBe(0);
  });
});

describe("INV-2: a user reviews a submission at most once, and never their own", () => {
  // Enforcement: the unique constraint on (reviewerId, submissionId) at the
  // database, and the self-review check in review.service.
  it("is held by the database, not only by the application", async () => {
    const author = await createUser();
    const reviewer = await createUser();
    const submission = await createSubmission(author.id);
    await createReview(submission, reviewer.id, [4]);

    await expect(
      prisma.review.create({
        data: {
          feedback: "A second review, written straight to the database.",
          reviewerId: reviewer.id,
          submissionId: submission.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(
      await prisma.review.count({
        where: { reviewerId: reviewer.id, submissionId: submission.id },
      }),
    ).toBe(1);
  });

  it("is held through the API: the second attempt is 409 and pays nothing", async () => {
    const author = await actAs("a");
    const reviewer = await actAs("b");
    const submission = await createSubmission(author.id);

    const first = await postReview(
      reviewer.authorization,
      submission.id,
      reviewBody(submission),
    );
    const karmaAfterFirst = await karmaOf(reviewer.id);
    const second = await postReview(
      reviewer.authorization,
      submission.id,
      reviewBody(submission),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(await karmaOf(reviewer.id)).toBe(karmaAfterFirst);
  });

  it("never lets an author review their own submission", async () => {
    const author = await actAs("a");
    const submission = await createSubmission(author.id);

    const res = await postReview(
      author.authorization,
      submission.id,
      reviewBody(submission),
    );

    expect(res.status).toBe(403);
    expect(
      await prisma.review.count({ where: { submissionId: submission.id } }),
    ).toBe(0);
  });
});

describe("INV-3: reviews and ratings are immutable once created", () => {
  // Enforcement: no route, no repository method and no updatedAt column.
  it("has no route that changes or removes a review or a rating", () => {
    const touchingReviews = registeredRoutes.filter(
      (route) =>
        route.path.includes("review") &&
        !(route.method === "get") &&
        !(route.method === "post" && route.path === "/submissions/:id/reviews"),
    );

    expect(touchingReviews).toEqual([]);
  });

  it.each([
    ["PUT", "/api/v1/submissions/1/reviews"],
    ["PATCH", "/api/v1/submissions/1/reviews"],
    ["PUT", "/api/v1/submissions/1/reviews/1"],
    ["PATCH", "/api/v1/submissions/1/reviews/1"],
    ["PATCH", "/api/v1/reviews/1"],
    ["PUT", "/api/v1/ratings/1"],
  ])("answers %s %s with the 404 envelope", async (method, path) => {
    const author = await actAs("a");
    const reviewer = await actAs("b");
    const submission = await createSubmission(author.id);
    await createReview(submission, reviewer.id, [4]);

    const attempt =
      method === "PUT" ? request(app).put(path) : request(app).patch(path);
    const res = await attempt
      .set("Authorization", reviewer.authorization)
      .send({ feedback: "Rewritten after the fact." });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("has no repository method that updates or deletes a review", () => {
    const methods = Object.keys(reviewRepository);

    expect(methods.length).toBeGreaterThan(0);
    expect(
      methods.filter((name) => /^(update|delete|remove|edit|set)/i.test(name)),
    ).toEqual([]);
  });

  it("has no updatedAt column on reviews or ratings", async () => {
    const columns = await prisma.$queryRaw<
      { table_name: string; column_name: string }[]
    >`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('Review', 'CriterionRating')`;

    // The tables are there to be inspected, and neither has a column named for
    // being changed.
    expect(
      [...new Set(columns.map((column) => column.table_name))].sort(),
    ).toEqual(["CriterionRating", "Review"]);
    expect(
      columns.filter((column) => /updated|modified/i.test(column.column_name)),
    ).toEqual([]);
  });

  it("is untouched when the submission it reviews is edited", async () => {
    const author = await actAs("a");
    const reviewer = await createUser();
    const submission = await createSubmission(author.id, {
      criteria: ["Readability", "Structure"],
    });
    const review = await createReview(submission, reviewer.id, [4, 5]);
    const snapshot = async () => ({
      review: await prisma.review.findUniqueOrThrow({
        where: { id: review.id },
      }),
      ratings: await prisma.criterionRating.findMany({
        where: { reviewId: review.id },
        orderBy: { id: "asc" },
      }),
    });
    const before = await snapshot();

    const res = await request(app)
      .put(`/api/v1/submissions/${submission.id}`)
      .set("Authorization", author.authorization)
      .send({
        title: unique("edited"),
        description: "An edit after the review was written.",
        githubUrl: "https://github.com/inv-owner/inv-repo",
        technologies: [unique("tag")],
      });

    expect(res.status).toBe(200);
    expect(await snapshot()).toEqual(before);
  });
});

describe("INV-4: nothing on the platform is ever deleted", () => {
  // Enforcement: no DELETE route (noDeleteRoutes.test.ts walks every path),
  // criteria absent from the edit schema, and ON DELETE RESTRICT at the
  // database as the second line of defence (D-03).
  it("registers no DELETE route at all", () => {
    expect(
      registeredRoutes.filter((route) => route.method === "delete"),
    ).toEqual([]);
  });

  it("locks the criteria at creation: an edit that sends them is refused", async () => {
    const author = await actAs("a");
    const submission = await createSubmission(author.id);

    const res = await request(app)
      .put(`/api/v1/submissions/${submission.id}`)
      .set("Authorization", author.authorization)
      .send({
        title: unique("inv4"),
        description: "An edit that tries to change the criteria.",
        githubUrl: "https://github.com/inv-owner/inv-repo",
        technologies: [unique("tag")],
        criteria: [{ label: "Something else entirely" }],
      });

    expect(res.status).toBe(400);
    expect(
      await prisma.criterion.count({ where: { submissionId: submission.id } }),
    ).toBe(1);
  });

  describe("at the database, when someone bypasses the application", () => {
    const reviewed = async () => {
      const author = await createUser();
      const reviewer = await createUser();
      const submission = await createSubmission(author.id);
      await createReview(submission, reviewer.id, [4]);
      return { author, reviewer, submission };
    };

    // A reviewed submission is held by two foreign keys, the review's and the
    // ratings' on its criteria, so this passes while either one stands. The
    // tests after it each pin a single key.
    it("refuses to delete a submission that has a review", async () => {
      const { submission } = await reviewed();

      await expect(
        prisma.submission.delete({ where: { id: submission.id } }),
      ).rejects.toMatchObject({ code: "P2003" });
      expect(
        await prisma.submission.count({ where: { id: submission.id } }),
      ).toBe(1);
    });

    it("refuses to delete a user who wrote a submission", async () => {
      const { author } = await reviewed();

      await expect(
        prisma.user.delete({ where: { id: author.id } }),
      ).rejects.toMatchObject({ code: "P2003" });
      expect(await prisma.user.count({ where: { id: author.id } })).toBe(1);
    });

    it("refuses to delete a user who wrote a review", async () => {
      const { reviewer } = await reviewed();

      await expect(
        prisma.user.delete({ where: { id: reviewer.id } }),
      ).rejects.toMatchObject({ code: "P2003" });
      expect(await prisma.user.count({ where: { id: reviewer.id } })).toBe(1);
    });

    it("refuses to delete a criterion that has a rating", async () => {
      const { submission } = await reviewed();
      const criterion = submission.criteria[0];
      if (!criterion) throw new Error("the fixture made no criteria");

      await expect(
        prisma.criterion.delete({ where: { id: criterion.id } }),
      ).rejects.toMatchObject({ code: "P2003" });
      expect(
        await prisma.criterion.count({ where: { id: criterion.id } }),
      ).toBe(1);
    });
  });
});

describe("INV-5: a replayed POST produces the original response and no second row", () => {
  // Enforcement: the Idempotency-Key middleware and the unique constraint on
  // (userId, endpoint, key), D-29.
  it("never pays karma twice for a review that is sent again", async () => {
    const author = await actAs("a");
    const reviewer = await actAs("b");
    const submission = await createSubmission(author.id);
    const key = unique("key").replace(/_/g, "-");
    const body = reviewBody(submission);

    const first = await postReview(
      reviewer.authorization,
      submission.id,
      body,
      key,
    );
    const replay = await postReview(
      reviewer.authorization,
      submission.id,
      body,
      key,
    );

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(
      await prisma.review.count({ where: { submissionId: submission.id } }),
    ).toBe(1);
    expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
  });

  it("never creates a second submission for one that is sent again", async () => {
    const author = await actAs("a");
    const key = unique("key").replace(/_/g, "-");
    const body = {
      title: unique("inv5"),
      description: "A submission sent twice under one key.",
      githubUrl: "https://github.com/inv-owner/inv-repo",
      criteria: [{ label: "Readability" }],
      technologies: [unique("tag")],
    };
    const send = () =>
      request(app)
        .post("/api/v1/submissions")
        .set("Authorization", author.authorization)
        .set("Idempotency-Key", key)
        .send(body);

    const first = await send();
    const replay = await send();

    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(
      await prisma.submission.count({
        where: { authorId: author.id, title: body.title },
      }),
    ).toBe(1);
  });
});
