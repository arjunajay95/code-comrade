import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { KARMA_PER_REVIEW } from "../../src/config/constants.js";
import { prisma } from "../../src/config/prisma.js";
import { actAs, type Actor } from "./auth.js";
import { createSubmission, unique } from "./fixtures.js";

// The Idempotency-Key header on the two real POST routes (D-29, INV-5). The
// middleware's own behaviour, including what happens after a 5xx, is tested
// in idempotencyProbe.test.ts. What is checked here is that it is wired to
// the right routes, in the right place in the chain, and that it keeps the
// promise INV-5 makes: a retried POST produces the original response and no
// second row.

const app = createApp();

type Criterion = { id: number; label: string };
type TestSubmission = { id: number; criteria: Criterion[] };

const FEEDBACK = "Clear structure, but the error handling needs another pass.";

// A complete submission body. The technology is unique per call, so it is
// built once per test and then reused, because a retry has to send exactly
// the same request.
const validSubmission = (overrides: Record<string, unknown> = {}) => ({
  title: unique("idem"),
  description: "A submission posted by the idempotency tests.",
  githubUrl: "https://github.com/idem-owner/idem-repo",
  criteria: [{ label: "Readability" }, { label: "Structure" }],
  technologies: [unique("tag")],
  ...overrides,
});

const reviewFor = (submission: TestSubmission) => ({
  feedback: FEEDBACK,
  ratings: submission.criteria.map((criterion, i) => ({
    criterionId: criterion.id,
    rating: [4, 5][i] ?? 3,
  })),
});

const postSubmission = (
  authorization: string | undefined,
  body: unknown,
  key?: string,
) => {
  const req = request(app).post("/api/v1/submissions");
  if (authorization) req.set("Authorization", authorization);
  if (key !== undefined) req.set("Idempotency-Key", key);
  return req.send(body as object);
};

const postReview = (
  authorization: string,
  submissionId: number,
  body: unknown,
  key?: string,
) => {
  const req = request(app)
    .post(`/api/v1/submissions/${submissionId}/reviews`)
    .set("Authorization", authorization);
  if (key !== undefined) req.set("Idempotency-Key", key);
  return req.send(body as object);
};

const keyRow = (userId: number, key: string) =>
  prisma.idempotencyKey.findFirst({ where: { userId, key } });

const karmaOf = async (userId: number) =>
  (
    await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { karma: true },
    })
  ).karma;

const reviewsBy = (userId: number) =>
  prisma.review.count({ where: { reviewerId: userId } });

describe("Idempotency-Key on the POST routes", () => {
  let author: Actor;
  // Every user this file creates, for the karma equation (V-Q1) at the end.
  const trackedUserIds: number[] = [];

  const reviewerOn = async (slot: "b" | "c" | "d"): Promise<Actor> => {
    const actor = await actAs(slot);
    trackedUserIds.push(actor.id);
    return actor;
  };

  beforeAll(async () => {
    author = await actAs("a");
    trackedUserIds.push(author.id);
  });

  describe("POST /submissions", () => {
    it("creates one submission however many times the same request is sent", async () => {
      const body = validSubmission();
      const key = unique("key");

      const first = await postSubmission(author.authorization, body, key);
      const second = await postSubmission(author.authorization, body, key);
      const third = await postSubmission(author.authorization, body, key);

      expect([first.status, second.status, third.status]).toEqual([
        201, 201, 201,
      ]);
      expect(second.body).toEqual(first.body);
      expect(third.body).toEqual(first.body);
      expect(
        await prisma.submission.count({
          where: { authorId: author.id, title: body.title },
        }),
      ).toBe(1);
    });

    it("stores the response under the route pattern, before the client sees it", async () => {
      const body = validSubmission();
      const key = unique("key");

      const res = await postSubmission(author.authorization, body, key);
      const row = await keyRow(author.id, key);

      expect(row).toMatchObject({
        status: "COMPLETED",
        responseCode: 201,
        endpoint: "POST /api/v1/submissions",
      });
      expect(row?.responseBody).toEqual(res.body);
    });

    it("is opt-in: without a key, two identical requests make two submissions", async () => {
      const body = validSubmission();

      const first = await postSubmission(author.authorization, body);
      const second = await postSubmission(author.authorization, body);

      expect([first.status, second.status]).toEqual([201, 201]);
      expect(second.body.data.id).not.toBe(first.body.data.id);
      expect(
        await prisma.submission.count({
          where: { authorId: author.id, title: body.title },
        }),
      ).toBe(2);
    });

    it("refuses the same key for a different request with 422 and makes nothing new", async () => {
      const body = validSubmission();
      const other = { ...body, title: unique("other") };
      const key = unique("key");
      await postSubmission(author.authorization, body, key);

      const res = await postSubmission(author.authorization, other, key);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
      expect(
        await prisma.submission.count({
          where: { authorId: author.id, title: other.title },
        }),
      ).toBe(0);
    });

    it("keeps keys apart between users", async () => {
      const someoneElse = await reviewerOn("c");
      const body = validSubmission();
      const key = unique("key");

      const mine = await postSubmission(author.authorization, body, key);
      const theirs = await postSubmission(someoneElse.authorization, body, key);

      expect([mine.status, theirs.status]).toEqual([201, 201]);
      expect(theirs.body.data.id).not.toBe(mine.body.data.id);
      expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(2);
    });

    it("refuses a malformed key with 400 before anything is created", async () => {
      const body = validSubmission();

      const res = await postSubmission(
        author.authorization,
        body,
        "not a valid key!",
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("Idempotency-Key");
      expect(
        await prisma.submission.count({
          where: { authorId: author.id, title: body.title },
        }),
      ).toBe(0);
    });

    it("never records a key for a request that was refused earlier in the chain", async () => {
      const key = unique("key");

      const res = await postSubmission(undefined, validSubmission(), key);

      expect(res.status).toBe(401);
      expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(0);
    });

    it("stores a validation failure and replays it with the new request's id", async () => {
      const bad = validSubmission({ title: "ab" });
      const key = unique("key");

      const first = await postSubmission(author.authorization, bad, key);
      const again = await postSubmission(author.authorization, bad, key);
      const corrected = await postSubmission(
        author.authorization,
        { ...bad, title: unique("fixed") },
        key,
      );

      expect(first.status).toBe(400);
      expect(again.status).toBe(400);
      expect(again.body.error.code).toBe("VALIDATION_ERROR");
      expect(again.body.error.message).toBe(first.body.error.message);
      expect(again.body.error.requestId).toBe(again.headers["x-request-id"]);
      expect(again.body.error.requestId).not.toBe(first.body.error.requestId);
      // A key describes one attempt: a corrected body needs a new key.
      expect(corrected.status).toBe(422);
      expect(corrected.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });

    it("creates exactly one submission when five identical requests arrive at once", async () => {
      const body = validSubmission();
      const key = unique("key");

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          postSubmission(author.authorization, body, key),
        ),
      );
      const successes = results.filter((r) => r.status === 201);

      // Each answer is either the one created response, a replay of it, or
      // "still in progress" for a request that arrived while it was running.
      expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(
        true,
      );
      expect(successes.length).toBeGreaterThanOrEqual(1);
      expect(new Set(successes.map((r) => r.body.data.id as number)).size).toBe(
        1,
      );
      expect(
        await prisma.submission.count({
          where: { authorId: author.id, title: body.title },
        }),
      ).toBe(1);
      expect((await keyRow(author.id, key))?.status).toBe("COMPLETED");
    });
  });

  describe("POST /submissions/:id/reviews", () => {
    const newSubmission = () =>
      createSubmission(author.id, { criteria: ["Readability", "Structure"] });

    it("pays karma once when the same review is sent again (INV-5)", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();
      const body = reviewFor(submission);
      const key = unique("key");

      const first = await postReview(
        reviewer.authorization,
        submission.id,
        body,
        key,
      );
      const second = await postReview(
        reviewer.authorization,
        submission.id,
        body,
        key,
      );

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      // The replay is the original response, not a fresh read of the karma.
      expect(second.body).toEqual(first.body);
      expect(second.body.data.reviewerKarma).toBe(KARMA_PER_REVIEW);
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
      expect(await reviewsBy(reviewer.id)).toBe(1);
    });

    it("stores the response under the route pattern", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();
      const key = unique("key");

      const res = await postReview(
        reviewer.authorization,
        submission.id,
        reviewFor(submission),
        key,
      );

      expect(await keyRow(reviewer.id, key)).toMatchObject({
        status: "COMPLETED",
        responseCode: 201,
        endpoint: "POST /api/v1/submissions/:id/reviews",
        responseBody: res.body,
      });
    });

    it("answers a second attempt under a new key with 409, and replays that 409 for its own key", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();
      const body = reviewFor(submission);
      const secondKey = unique("key");
      await postReview(
        reviewer.authorization,
        submission.id,
        body,
        unique("key"),
      );

      const conflict = await postReview(
        reviewer.authorization,
        submission.id,
        body,
        secondKey,
      );
      const replayed = await postReview(
        reviewer.authorization,
        submission.id,
        body,
        secondKey,
      );

      expect(conflict.status).toBe(409);
      expect(conflict.body.error.code).toBe("CONFLICT");
      expect(replayed.status).toBe(409);
      expect(replayed.body.error.code).toBe("CONFLICT");
      expect(replayed.body.error.requestId).toBe(
        replayed.headers["x-request-id"],
      );
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
      expect(await reviewsBy(reviewer.id)).toBe(1);
    });

    it("pays karma once when five identical reviews arrive at once", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();
      const body = reviewFor(submission);
      const key = unique("key");

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          postReview(reviewer.authorization, submission.id, body, key),
        ),
      );
      const successes = results.filter((r) => r.status === 201);

      expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(
        true,
      );
      expect(successes.length).toBeGreaterThanOrEqual(1);
      expect(
        new Set(successes.map((r) => r.body.data.review.id as number)).size,
      ).toBe(1);
      expect(await reviewsBy(reviewer.id)).toBe(1);
      expect(await karmaOf(reviewer.id)).toBe(KARMA_PER_REVIEW);
    });

    it("treats the same key on a different endpoint as a different key", async () => {
      const reviewer = await reviewerOn("b");
      const submission = await newSubmission();
      const key = unique("key");

      const posted = await postSubmission(
        reviewer.authorization,
        validSubmission(),
        key,
      );
      const reviewed = await postReview(
        reviewer.authorization,
        submission.id,
        reviewFor(submission),
        key,
      );

      expect([posted.status, reviewed.status]).toEqual([201, 201]);
      expect(
        await prisma.idempotencyKey.count({
          where: { userId: reviewer.id, key },
        }),
      ).toBe(2);
    });

    it("stores a refusal too: a self-review is 403 the first time and the same 403 again", async () => {
      const submission = await newSubmission();
      const body = reviewFor(submission);
      const key = unique("key");

      const first = await postReview(
        author.authorization,
        submission.id,
        body,
        key,
      );
      const again = await postReview(
        author.authorization,
        submission.id,
        body,
        key,
      );

      expect(first.status).toBe(403);
      expect(again.status).toBe(403);
      expect(again.body.error.code).toBe("FORBIDDEN");
      expect(await karmaOf(author.id)).toBe(0);
    });
  });

  // V-Q1 as a standing check for everyone this file created. A retried
  // review that paid twice would show up here.
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
