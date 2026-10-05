import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { KARMA_PER_REVIEW } from "../../src/config/constants.js";
import { prisma } from "../../src/config/prisma.js";
import { reviewRepository } from "../../src/repository/review.repository.js";
import { actAs, type Actor } from "./auth.js";
import { createSubmission, createUser } from "./fixtures.js";

const app = createApp();

// A valid id that no row has, so the schema accepts it and the lookup misses.
const NO_SUCH_ID = 2_000_000_000;

type Criterion = { id: number; label: string };
type TestSubmission = { id: number; criteria: Criterion[] };

const FEEDBACK = "Clear structure, but the error handling needs another pass.";

const rate = (criterion: Criterion, i = 0) => ({
  criterionId: criterion.id,
  rating: [4, 5, 3, 2, 1][i] ?? 3,
});

// A complete review body: one rating for every criterion of the submission.
// Each test starts from this and changes only what it is about.
const validReview = (
  submission: TestSubmission,
  overrides: Record<string, unknown> = {},
) => ({
  feedback: FEEDBACK,
  ratings: submission.criteria.map(rate),
  ...overrides,
});

const post = (
  authorization: string | undefined,
  submissionId: number | string,
  body: unknown,
) => {
  const req = request(app).post(`/api/v1/submissions/${submissionId}/reviews`);
  if (authorization) req.set("Authorization", authorization);
  return req.send(body as object);
};

const karmaOf = async (userId: number) =>
  (
    await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { karma: true },
    })
  ).karma;

const reviewsBy = (userId: number) =>
  prisma.review.count({ where: { reviewerId: userId } });

const byStatus = (a: { status: number }, b: { status: number }) =>
  a.status - b.status;

describe("POST /submissions/:id/reviews", () => {
  let author: Actor;
  // Every user this file creates, so the last test can check the karma
  // equation (V-Q1) for all of them.
  const trackedUserIds: number[] = [];

  // A fresh reviewer on the given slot: karma 0, no reviews, a real session.
  const reviewerOn = async (slot: "b" | "c" | "d"): Promise<Actor> => {
    const actor = await actAs(slot);
    trackedUserIds.push(actor.id);
    return actor;
  };

  const newSubmission = (criteria = ["Readability", "Structure"]) =>
    createSubmission(author.id, { criteria });

  beforeAll(async () => {
    author = await actAs("a");
    trackedUserIds.push(author.id);
  });

  describe("who may review", () => {
    it("rejects a request with no session", async () => {
      const submission = await newSubmission();

      const res = await post(undefined, submission.id, validReview(submission));

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(
        await prisma.review.count({ where: { submissionId: submission.id } }),
      ).toBe(0);
    });

    it("answers 404 for a submission that does not exist, and awards nothing", async () => {
      const reviewer = await reviewerOn("b");

      const res = await post(reviewer.authorization, NO_SUCH_ID, {
        feedback: FEEDBACK,
        ratings: [{ criterionId: 1, rating: 3 }],
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(await karmaOf(reviewer.id)).toBe(0);
    });

    it("rejects the author reviewing their own submission with 403", async () => {
      const submission = await newSubmission();

      const res = await post(
        author.authorization,
        submission.id,
        validReview(submission),
      );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(await reviewsBy(author.id)).toBe(0);
      expect(await karmaOf(author.id)).toBe(0);
    });

    it("answers a self-review with 403 before it looks at the ratings", async () => {
      const submission = await newSubmission();

      const res = await post(
        author.authorization,
        submission.id,
        validReview(submission, {
          ratings: [{ criterionId: NO_SUCH_ID, rating: 3 }],
        }),
      );

      // Not 400 CRITERIA_MISMATCH: the earlier check wins, so the ratings
      // check cannot be used to learn anything about a submission the caller
      // may not review.
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("a valid review", () => {
    let reviewer: Actor;
    let submission: TestSubmission;
    let res: Awaited<ReturnType<typeof post>>;

    beforeAll(async () => {
      reviewer = await reviewerOn("b");
      submission = await newSubmission();
      res = await post(
        reviewer.authorization,
        submission.id,
        // Padded, to show the stored feedback is trimmed.
        validReview(submission, { feedback: `   ${FEEDBACK}  \n` }),
      );
    });

    it("returns 201 with the stored review and the reviewer's new karma", () => {
      const { review, reviewerKarma } = res.body.data;

      expect(res.status).toBe(201);
      expect(review).toMatchObject({
        submissionId: submission.id,
        feedback: FEEDBACK,
        reviewer: reviewer.username,
        ratings: submission.criteria.map((c, i) => rate(c, i)),
      });
      expect(typeof review.id).toBe("number");
      expect(reviewerKarma).toBe(KARMA_PER_REVIEW);
    });

    it("returns exactly the documented fields and no more", () => {
      expect(Object.keys(res.body.data).sort()).toEqual([
        "review",
        "reviewerKarma",
      ]);
      expect(Object.keys(res.body.data.review).sort()).toEqual([
        "createdAt",
        "feedback",
        "id",
        "ratings",
        "reviewer",
        "submissionId",
      ]);
      // D-08: no Clerk identifier anywhere in the body.
      expect(JSON.stringify(res.body)).not.toMatch(/clerk/i);
    });

    it("pays the reviewer and never the author (INV-1)", async () => {
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
      expect(await karmaOf(author.id)).toBe(0);
    });

    it("shows the same karma where the client reads it", async () => {
      const me = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", reviewer.authorization);

      expect(me.status).toBe(200);
      expect(me.body.data.karma).toBe(res.body.data.reviewerKarma);
    });

    it("stores one rating per criterion (V-Q3)", async () => {
      const ratings = await prisma.criterionRating.findMany({
        where: { reviewId: res.body.data.review.id },
        select: { criterionId: true },
      });

      expect(ratings.map((r) => r.criterionId).sort((a, b) => a - b)).toEqual(
        submission.criteria.map((c) => c.id).sort((a, b) => a - b),
      );
    });

    it("turns the submission REVIEWED and feeds the criterion averages", async () => {
      const detail = await request(app).get(
        `/api/v1/submissions/${submission.id}`,
      );
      const data = detail.body.data;

      expect(data.status).toBe("REVIEWED");
      expect(data.reviewCount).toBe(1);
      expect(data.reviews[0]).toMatchObject({
        id: res.body.data.review.id,
        feedback: FEEDBACK,
        reviewer: reviewer.username,
      });
      expect(
        data.criteria.map((c: { averageRating: number }) => c.averageRating),
      ).toEqual([4, 5]);
    });
  });

  describe("a second review of the same submission", () => {
    it("is rejected with 409, awards nothing and leaves one review", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();

      const first = await post(
        reviewer.authorization,
        submission.id,
        validReview(submission),
      );
      const second = await post(
        reviewer.authorization,
        submission.id,
        validReview(submission, { feedback: `${FEEDBACK} A second attempt.` }),
      );

      expect(first.status).toBe(201);
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe("CONFLICT");
      expect(await reviewsBy(reviewer.id)).toBe(1);
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
    });

    it("does not stop someone else from reviewing it", async () => {
      const first = await reviewerOn("b");
      const second = await reviewerOn("c");
      const submission = await newSubmission();

      const one = await post(
        first.authorization,
        submission.id,
        validReview(submission),
      );
      const two = await post(
        second.authorization,
        submission.id,
        validReview(submission),
      );

      expect(one.status).toBe(201);
      expect(two.status).toBe(201);
      expect(
        await prisma.review.count({ where: { submissionId: submission.id } }),
      ).toBe(2);
      expect(await karmaOf(second.id)).toBe(KARMA_PER_REVIEW);
    });
  });

  // A review rates every criterion of its submission, exactly once. Anything
  // else is rejected before the transaction starts (V-Q3, V-Q4).
  describe("ratings that do not match the submission's criteria", () => {
    it.each<
      [
        string,
        (own: TestSubmission, other: TestSubmission) => Record<string, unknown>,
      ]
    >([
      [
        "a criterion left out",
        (own) => ({ ratings: own.criteria.slice(0, 1).map(rate) }),
      ],
      [
        "criteria that belong to another submission",
        (_own, other) => ({ ratings: other.criteria.map(rate) }),
      ],
      [
        "one criterion that belongs to another submission",
        (own, other) => ({
          ratings: [
            ...own.criteria.slice(0, 1),
            ...other.criteria.slice(0, 1),
          ].map(rate),
        }),
      ],
      [
        "a criterion that does not exist",
        (own) => ({
          ratings: [
            { criterionId: NO_SUCH_ID, rating: 3 },
            ...own.criteria.slice(1).map(rate),
          ],
        }),
      ],
      [
        "every criterion plus one from another submission",
        (own, other) => ({
          ratings: [...own.criteria, ...other.criteria.slice(0, 1)].map(rate),
        }),
      ],
    ])("rejects %s with CRITERIA_MISMATCH", async (_name, build) => {
      const reviewer = await reviewerOn("b");
      const own = await newSubmission();
      const other = await newSubmission();

      const res = await post(
        reviewer.authorization,
        own.id,
        validReview(own, build(own, other)),
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CRITERIA_MISMATCH");
      expect(await reviewsBy(reviewer.id)).toBe(0);
      expect(await karmaOf(reviewer.id)).toBe(0);
    });
  });

  // The schema has its own unit tests for every limit. These check that the
  // validate middleware is wired to this route and names the failing field.
  describe("a body or id the schema rejects", () => {
    it.each<[string, Record<string, unknown>, string]>([
      ["missing feedback", { feedback: undefined }, "body.feedback"],
      [
        "feedback that is too short",
        { feedback: "too short" },
        "body.feedback",
      ],
      [
        "a rating of 6",
        { ratings: [{ criterionId: 1, rating: 6 }] },
        "body.ratings.0.rating",
      ],
      [
        "the same criterion rated twice",
        {
          ratings: [
            { criterionId: 1, rating: 3 },
            { criterionId: 1, rating: 4 },
          ],
        },
        "body.ratings",
      ],
      // The mass assignment control: the reviewer is the session user, and
      // karma is never client input.
      ["a reviewerId field", { reviewerId: 1 }, "reviewerId"],
      ["a karma field", { karma: 100 }, "karma"],
    ])("rejects %s with VALIDATION_ERROR", async (_name, extra, mentioned) => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();

      const res = await post(
        reviewer.authorization,
        submission.id,
        validReview(submission, extra),
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain(mentioned);
      expect(await reviewsBy(reviewer.id)).toBe(0);
      expect(await karmaOf(reviewer.id)).toBe(0);
    });

    it.each(["abc", "0", "2147483648"])(
      "rejects the id %j in the path",
      async (id) => {
        const reviewer = await reviewerOn("b");

        const res = await post(reviewer.authorization, id, {
          feedback: FEEDBACK,
          ratings: [{ criterionId: 1, rating: 3 }],
        });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  // The review and its karma are one unit (D-13). These call the repository
  // directly, because the service would refuse the bad input long before the
  // database does.
  describe("the karma transaction", () => {
    it("rolls back the review, the ratings and the karma when a rating cannot be stored", async () => {
      const reviewer = await createUser();
      trackedUserIds.push(reviewer.id);
      const submission = await newSubmission();

      await expect(
        reviewRepository.createWithKarma({
          reviewerId: reviewer.id,
          submissionId: submission.id,
          feedback: "A review that is going to fail partway through.",
          ratings: [
            // Valid ratings first, then one whose criterion does not exist,
            // so the failure comes after the karma was already incremented.
            ...submission.criteria.map((c) => ({
              criterionId: c.id,
              rating: 4,
            })),
            { criterionId: 2_147_483_647, rating: 4 },
          ],
        }),
      ).rejects.toThrow();

      expect(await karmaOf(reviewer.id)).toBe(0);
      expect(await reviewsBy(reviewer.id)).toBe(0);
      expect(
        await prisma.criterionRating.count({
          where: { criterion: { submissionId: submission.id } },
        }),
      ).toBe(0);
    });

    it("reports a duplicate as null and does not award karma a second time", async () => {
      const reviewer = await createUser();
      trackedUserIds.push(reviewer.id);
      const submission = await newSubmission();
      const input = {
        reviewerId: reviewer.id,
        submissionId: submission.id,
        feedback: "A review written directly through the repository.",
        ratings: submission.criteria.map((c) => ({
          criterionId: c.id,
          rating: 4,
        })),
      };

      const first = await reviewRepository.createWithKarma(input);
      const second = await reviewRepository.createWithKarma(input);

      expect(first?.reviewerKarma).toBe(KARMA_PER_REVIEW);
      expect(second).toBeNull();
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
      expect(await reviewsBy(reviewer.id)).toBe(1);
    });
  });

  // Duplicates are decided by the unique constraint, never by a check made
  // beforehand, because a check cannot stop two requests passing it together.
  describe("simultaneous requests", () => {
    it("five identical reviews at once create one review and award karma once", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          post(reviewer.authorization, submission.id, validReview(submission)),
        ),
      );

      expect(results.sort(byStatus).map((r) => r.status)).toEqual([
        201, 409, 409, 409, 409,
      ]);
      expect(await reviewsBy(reviewer.id)).toBe(1);
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
    });

    it("one reviewer on four submissions at once keeps every award", async () => {
      const reviewer = await reviewerOn("b");
      const submissions = await Promise.all([
        newSubmission(),
        newSubmission(),
        newSubmission(),
        newSubmission(),
      ]);

      const results = await Promise.all(
        submissions.map((s) =>
          post(reviewer.authorization, s.id, validReview(s)),
        ),
      );

      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
      expect(await reviewsBy(reviewer.id)).toBe(4);
      expect(await karmaOf(reviewer.id)).toBe(4 * KARMA_PER_REVIEW);
    });
  });

  // V-Q1 as a standing check for everyone this file created. The suite-wide
  // version, over the whole database, comes with the cross-cutting tests.
  describe("the karma equation", () => {
    it("holds for every user this file created: karma = KARMA_PER_REVIEW x reviews", async () => {
      const users = await prisma.user.findMany({
        where: { id: { in: trackedUserIds } },
        select: {
          id: true,
          karma: true,
          _count: { select: { reviews: true } },
        },
      });

      expect(users.length).toBe(trackedUserIds.length);
      for (const user of users) {
        expect(user.karma).toBe(KARMA_PER_REVIEW * user._count.reviews);
      }
    });
  });
});
