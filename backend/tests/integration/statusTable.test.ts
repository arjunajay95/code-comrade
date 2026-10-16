import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { clerkClient } from "../../src/config/clerk.js";
import { prisma } from "../../src/config/prisma.js";
import { healthRepository } from "../../src/repository/health.repository.js";
import { submissionRepository } from "../../src/repository/submission.repository.js";
import { userRepository } from "../../src/repository/user.repository.js";
import { hashRequest } from "../../src/utils/idempotency.js";
import { actAs, bearerFor, releaseSlot } from "./auth.js";
import { createSubmission, unique } from "./fixtures.js";

// D-10's condition-to-error table, row by row. Every test title starts with
// "D-10 row N" and the row's own status and code, so the table's coverage can
// be audited by searching for those titles. Rows 12 (rate limit) and 15
// (request timeout) need the app built with different settings, so they live
// in rateLimit.test.ts and requestTimeout.test.ts.

const app = createApp();

afterEach(() => {
  vi.restoreAllMocks();
});

// Every error, whatever its row, has the same envelope (PROJECT_BLUEPRINT
// section 3): the request id in the body is the one in the header, it is never
// cached, and nothing internal is in it, no stack trace and no ORM text (D-10).
const expectError = (
  res: request.Response,
  status: number,
  code: string,
): void => {
  expect(res.status).toBe(status);
  expect(res.body).toMatchObject({
    success: false,
    error: { code, message: expect.any(String) as unknown },
  });
  expect(res.body.error.requestId).toBe(res.headers["x-request-id"]);
  expect(res.headers["cache-control"]).toBe("no-store");
  expect(res.text).not.toMatch(/prisma|node_modules|\bat .+:\d+:\d+/i);
};

const validSubmission = (overrides: Record<string, unknown> = {}) => ({
  title: unique("status"),
  description: "A submission posted by the status table tests.",
  githubUrl: "https://github.com/status-owner/status-repo",
  criteria: [{ label: "Readability" }, { label: "Structure" }],
  technologies: [unique("tag")],
  ...overrides,
});

const postSubmission = (
  authorization: string | undefined,
  body: unknown,
  headers: Record<string, string> = {},
) => {
  const req = request(app).post("/api/v1/submissions").set(headers);
  if (authorization) req.set("Authorization", authorization);
  return req.send(body as object);
};

const reviewBody = (submission: {
  criteria: { id: number }[];
}): {
  feedback: string;
  ratings: { criterionId: number; rating: number }[];
} => ({
  feedback: "Clear structure, but the error handling needs another pass.",
  ratings: submission.criteria.map((criterion) => ({
    criterionId: criterion.id,
    rating: 4,
  })),
});

const postReview = (
  authorization: string,
  submissionId: number,
  body: unknown,
) =>
  request(app)
    .post(`/api/v1/submissions/${submissionId}/reviews`)
    .set("Authorization", authorization)
    .send(body as object);

describe("D-10: the condition to error table", () => {
  it("D-10 row 1: a Zod validation failure is 400 VALIDATION_ERROR, naming the field", async () => {
    const author = await actAs("a");

    const res = await postSubmission(author.authorization, {});

    expectError(res, 400, "VALIDATION_ERROR");
    expect(res.body.error.message).toContain("body.title");
  });

  it("D-10 row 2: ratings that do not match the criteria are 400 CRITERIA_MISMATCH", async () => {
    const author = await actAs("a");
    const reviewer = await actAs("b");
    const submission = await createSubmission(author.id, {
      criteria: ["Readability", "Structure"],
    });
    const body = reviewBody(submission);

    const res = await postReview(reviewer.authorization, submission.id, {
      ...body,
      ratings: body.ratings.slice(0, 1),
    });

    expectError(res, 400, "CRITERIA_MISMATCH");
  });

  it("D-10 row 3: an invalid GitHub URL is 400 INVALID_REPO_URL, not VALIDATION_ERROR", async () => {
    const author = await actAs("a");

    const res = await postSubmission(
      author.authorization,
      validSubmission({ githubUrl: "http://github.com/o/r" }),
    );

    expectError(res, 400, "INVALID_REPO_URL");
  });

  it("D-10 row 4: no valid session is 401 UNAUTHORIZED, for a missing and for a bad token", async () => {
    const missing = await request(app).get("/api/v1/users/me");
    const garbage = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer not-a-real-token");

    expectError(missing, 401, "UNAUTHORIZED");
    expectError(garbage, 401, "UNAUTHORIZED");
  });

  it("D-10 row 5: an ownership failure is 403 FORBIDDEN", async () => {
    const owner = await actAs("a");
    const outsider = await actAs("b");
    const submission = await createSubmission(owner.id);

    const res = await request(app)
      .put(`/api/v1/submissions/${submission.id}`)
      .set("Authorization", outsider.authorization)
      .send({
        title: "Not yours to edit",
        description: "An edit by someone who is not the author.",
        githubUrl: "https://github.com/o/r",
        technologies: ["x"],
      });

    expectError(res, 403, "FORBIDDEN");
  });

  it("D-10 row 5: a self-review attempt is 403 FORBIDDEN", async () => {
    const author = await actAs("a");
    const submission = await createSubmission(author.id);

    const res = await postReview(
      author.authorization,
      submission.id,
      reviewBody(submission),
    );

    expectError(res, 403, "FORBIDDEN");
  });

  it("D-10 row 6: a resource that does not exist is 404 NOT_FOUND, for a submission, a user and a route", async () => {
    const submission = await request(app).get("/api/v1/submissions/2000000000");
    const user = await request(app).get(`/api/v1/users/${unique("nobody")}`);
    const route = await request(app).get("/api/v1/nothing-here");

    expectError(submission, 404, "NOT_FOUND");
    expectError(user, 404, "NOT_FOUND");
    expectError(route, 404, "NOT_FOUND");
    // No route leakage: the 404 for an unknown path does not repeat the path.
    expect(route.body.error.message).not.toContain("nothing-here");
  });

  it("D-10 row 7: a duplicate review (the unique pair) is 409 CONFLICT", async () => {
    const author = await actAs("a");
    const reviewer = await actAs("b");
    const submission = await createSubmission(author.id);
    const body = reviewBody(submission);

    const first = await postReview(reviewer.authorization, submission.id, body);
    const second = await postReview(
      reviewer.authorization,
      submission.id,
      body,
    );

    expect(first.status).toBe(201);
    expectError(second, 409, "CONFLICT");
  });

  it("D-10 row 8: a username that is already taken is 409 CONFLICT", async () => {
    const taken = await actAs("a");
    const me = await actAs("b");

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", me.authorization)
      .send({ username: taken.username });

    expectError(res, 409, "CONFLICT");
  });

  it("D-10 row 9: a request whose key is still in flight is 409 REQUEST_IN_PROGRESS", async () => {
    const author = await actAs("a");
    const body = validSubmission();
    const key = unique("key").replace(/_/g, "-");
    // The first request is still running: its key is recorded, with no
    // response stored yet, and it is younger than the timeout.
    await prisma.idempotencyKey.create({
      data: {
        userId: author.id,
        endpoint: "POST /api/v1/submissions",
        key,
        requestHash: hashRequest("POST", "/api/v1/submissions", body),
        status: "IN_FLIGHT",
      },
    });

    const res = await postSubmission(author.authorization, body, {
      "Idempotency-Key": key,
    });

    expectError(res, 409, "REQUEST_IN_PROGRESS");
    expect(
      await prisma.submission.count({
        where: { authorId: author.id, title: body.title },
      }),
    ).toBe(0);
  });

  it("D-10 row 10: a key reused with a different body is 422 IDEMPOTENCY_KEY_REUSED", async () => {
    const author = await actAs("a");
    const key = unique("key").replace(/_/g, "-");
    await postSubmission(author.authorization, validSubmission(), {
      "Idempotency-Key": key,
    });

    const res = await postSubmission(author.authorization, validSubmission(), {
      "Idempotency-Key": key,
    });

    expectError(res, 422, "IDEMPOTENCY_KEY_REUSED");
  });

  it("D-10 row 11: a malformed Idempotency-Key is 400 VALIDATION_ERROR", async () => {
    const author = await actAs("a");

    const res = await postSubmission(author.authorization, validSubmission(), {
      "Idempotency-Key": "not a valid key!",
    });

    expectError(res, 400, "VALIDATION_ERROR");
    expect(res.body.error.message).toContain("Idempotency-Key");
  });

  it("D-10 row 13: a body over BODY_LIMIT is 413 PAYLOAD_TOO_LARGE", async () => {
    const author = await actAs("a");

    const res = await postSubmission(
      author.authorization,
      validSubmission({ description: "x".repeat(120_000) }),
    );

    expectError(res, 413, "PAYLOAD_TOO_LARGE");
  });

  it("D-10 row 14: a body that is not valid JSON is 400 VALIDATION_ERROR", async () => {
    const author = await actAs("a");

    const res = await request(app)
      .post("/api/v1/submissions")
      .set("Authorization", author.authorization)
      .set("Content-Type", "application/json")
      .send("{ not json");

    expectError(res, 400, "VALIDATION_ERROR");
  });

  it("D-10 row 16: a readiness check that cannot reach the database is 503 SERVICE_UNAVAILABLE", async () => {
    vi.spyOn(healthRepository, "pingDatabase").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED secret-db-host.internal:5432"),
    );

    const res = await request(app).get("/api/v1/health/ready");

    expectError(res, 503, "SERVICE_UNAVAILABLE");
    // The real cause is logged, never sent: connection details stay private.
    expect(res.text).not.toContain("secret-db-host");
  });

  it("D-10 row 17: first-request account setup failing because Clerk is unreachable is 503 SERVICE_UNAVAILABLE", async () => {
    await releaseSlot("d");
    const authorization = await bearerFor("d");
    vi.spyOn(clerkClient.users, "getUser").mockRejectedValueOnce(
      new Error("connect ETIMEDOUT clerk-secret-detail"),
    );

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", authorization);

    expectError(res, 503, "SERVICE_UNAVAILABLE");
    expect(res.text).not.toContain("clerk-secret-detail");
    // "Please retry" is true: nothing was half created, so the retry works.
    const retry = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", authorization);
    expect(retry.status).toBe(200);
  });

  it("D-10 row 17: first-request account setup running out of username attempts is 503 SERVICE_UNAVAILABLE", async () => {
    await releaseSlot("d");
    const authorization = await bearerFor("d");
    vi.spyOn(clerkClient.users, "getUser").mockResolvedValue({
      username: null,
      firstName: "Status",
      lastName: "Table",
    } as Awaited<ReturnType<typeof clerkClient.users.getUser>>);
    const create = vi
      .spyOn(userRepository, "createAuthUser")
      .mockResolvedValue(null);
    vi.spyOn(userRepository, "findAuthUserByClerkId").mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", authorization);

    expectError(res, 503, "SERVICE_UNAVAILABLE");
    // One plain attempt and four with a suffix, then it stops.
    expect(create).toHaveBeenCalledTimes(5);
  });

  it("D-10 row 18: anything unexpected is 500 INTERNAL, with nothing internal in the body", async () => {
    vi.spyOn(submissionRepository, "findDetailById").mockRejectedValueOnce(
      new Error("boom: SELECT secret_column FROM somewhere"),
    );

    const res = await request(app).get("/api/v1/submissions/1");

    expectError(res, 500, "INTERNAL");
    expect(res.text).not.toMatch(/boom|secret_column|SELECT/);
  });
});
