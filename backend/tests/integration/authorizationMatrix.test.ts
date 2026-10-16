import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { KARMA_PER_REVIEW } from "../../src/config/constants.js";
import { prisma } from "../../src/config/prisma.js";
import { registeredRoutes } from "../../src/routes/registry.js";
import { actAs, type Actor } from "./auth.js";
import { createSubmission, unique } from "./fixtures.js";

// AUTHORIZATION_MATRIX section 1, as an executable table, and section 5's
// "one test group per endpoint" for the routes that have an owner. There are
// three actors and only three: a visitor with no session, a user, and the
// owner of the resource. The table has a row for every route the app registers,
// and a test fails if a route is added without one, so a new route cannot
// quietly skip the question "who may call this?". It uses about half of this
// file's budget of 100 requests under the global rate limiter, so a new route
// adds a row, and a second file is the place for anything much larger.

const app = createApp();

interface Context {
  owner: Actor;
  user: Actor;
  submission: { id: number; criteria: { id: number }[] };
}

type Send = (
  context: Context,
  authorization: string | undefined,
) => request.Test;

const withAuth = (req: request.Test, authorization: string | undefined) =>
  authorization ? req.set("Authorization", authorization) : req;

const get =
  (path: string): Send =>
  (_context, authorization) =>
    withAuth(request(app).get(`/api/v1${path}`), authorization);

const validSubmission = () => ({
  title: unique("matrix"),
  description: "A submission posted by the authorization matrix tests.",
  githubUrl: "https://github.com/matrix-owner/matrix-repo",
  criteria: [{ label: "Readability" }],
  technologies: [unique("tag")],
});

const validEdit = () => ({
  title: unique("edited"),
  description: "An edit made by the authorization matrix tests.",
  githubUrl: "https://github.com/matrix-owner/matrix-repo",
  technologies: [unique("tag")],
});

const validReview = (submission: Context["submission"]) => ({
  feedback: "Clear structure, but the error handling needs another pass.",
  ratings: submission.criteria.map((criterion) => ({
    criterionId: criterion.id,
    rating: 4,
  })),
});

interface Row {
  send: Send;
  // The status for each actor. A row without an owner is one where the owner
  // is not a separate case: the route is the same for every signed-in user.
  visitor: number;
  user: number;
  owner?: number;
}

// Keys are "METHOD /path" exactly as the route registry records them.
const MATRIX: Record<string, Row> = {
  "GET /health/live": { send: get("/health/live"), visitor: 200, user: 200 },
  "GET /health/ready": { send: get("/health/ready"), visitor: 200, user: 200 },
  "GET /feed": { send: get("/feed"), visitor: 200, user: 200 },
  "GET /feed/personalized": {
    send: get("/feed/personalized"),
    visitor: 401,
    user: 200,
  },
  "GET /submissions/:id": {
    send: (context, authorization) =>
      withAuth(
        request(app).get(`/api/v1/submissions/${context.submission.id}`),
        authorization,
      ),
    visitor: 200,
    user: 200,
    owner: 200,
  },
  "POST /submissions": {
    send: (_context, authorization) =>
      withAuth(request(app).post("/api/v1/submissions"), authorization).send(
        validSubmission(),
      ),
    visitor: 401,
    user: 201,
  },
  "PUT /submissions/:id": {
    send: (context, authorization) =>
      withAuth(
        request(app).put(`/api/v1/submissions/${context.submission.id}`),
        authorization,
      ).send(validEdit()),
    visitor: 401,
    user: 403,
    owner: 200,
  },
  "POST /submissions/:id/reviews": {
    send: (context, authorization) =>
      withAuth(
        request(app).post(
          `/api/v1/submissions/${context.submission.id}/reviews`,
        ),
        authorization,
      ).send(validReview(context.submission)),
    visitor: 401,
    user: 201,
    owner: 403,
  },
  "GET /users/me": { send: get("/users/me"), visitor: 401, user: 200 },
  "GET /users/me/submissions": {
    send: get("/users/me/submissions"),
    visitor: 401,
    user: 200,
  },
  "GET /users/me/reviews": {
    send: get("/users/me/reviews"),
    visitor: 401,
    user: 200,
  },
  "GET /users/me/reviews-received": {
    send: get("/users/me/reviews-received"),
    visitor: 401,
    user: 200,
  },
  "PATCH /users/me": {
    send: (_context, authorization) =>
      withAuth(request(app).patch("/api/v1/users/me"), authorization).send({
        bio: "Set by the authorization matrix tests.",
      }),
    visitor: 401,
    user: 200,
  },
  "GET /users/:username": {
    send: (context, authorization) =>
      withAuth(
        request(app).get(`/api/v1/users/${context.owner.username}`),
        authorization,
      ),
    visitor: 200,
    user: 200,
  },
  "GET /technologies": { send: get("/technologies"), visitor: 200, user: 200 },
};

const MISSING_ID = 2_000_000_000;

describe("the access matrix (AUTHORIZATION_MATRIX section 1)", () => {
  let context: Context;

  beforeAll(async () => {
    const owner = await actAs("a");
    const user = await actAs("b");
    const submission = await createSubmission(owner.id, {
      criteria: ["Readability", "Structure"],
    });
    context = { owner, user, submission };
  });

  it("has a row for every route the app registers, and for no route it does not", () => {
    const registered = registeredRoutes.map(
      (route) => `${route.method.toUpperCase()} ${route.path}`,
    );

    expect(Object.keys(MATRIX).sort()).toEqual([...registered].sort());
  });

  it.each(Object.entries(MATRIX))("%s", async (_route, row) => {
    const visitor = await row.send(context, undefined);
    const user = await row.send(context, context.user.authorization);

    expect(visitor.status, "as a visitor").toBe(row.visitor);
    if (row.visitor === 401) {
      expect(visitor.body.error.code).toBe("UNAUTHORIZED");
    }
    expect(user.status, "as a signed-in user").toBe(row.user);
    if (row.user === 403) expect(user.body.error.code).toBe("FORBIDDEN");

    if (row.owner !== undefined) {
      const owner = await row.send(context, context.owner.authorization);
      expect(owner.status, "as the owner").toBe(row.owner);
      if (row.owner === 403) expect(owner.body.error.code).toBe("FORBIDDEN");
    }
  });
});

// Section 5: for every route with an :id or an owner, a group with a 401, a
// 403, a success and a 404, where the 404 also arrives for someone who does not
// own the resource, which proves the ordering rule in section 3: existence
// first, then ownership, so a non-owner learns nothing from the difference.

describe("PUT /submissions/:id", () => {
  let owner: Actor;
  let outsider: Actor;

  beforeAll(async () => {
    owner = await actAs("a");
    outsider = await actAs("b");
  });

  const put = (id: number, authorization: string | undefined, body: object) =>
    withAuth(request(app).put(`/api/v1/submissions/${id}`), authorization).send(
      body,
    );

  const titleOf = async (id: number) =>
    (
      await prisma.submission.findUniqueOrThrow({
        where: { id },
        select: { title: true },
      })
    ).title;

  it("is 401 for a visitor, and nothing changes", async () => {
    const submission = await createSubmission(owner.id, { title: "Original" });

    const res = await put(submission.id, undefined, validEdit());

    expect(res.status).toBe(401);
    expect(await titleOf(submission.id)).toBe("Original");
  });

  it("is 403 for a signed-in user who is not the author, and nothing changes", async () => {
    const submission = await createSubmission(owner.id, { title: "Original" });

    const res = await put(submission.id, outsider.authorization, validEdit());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await titleOf(submission.id)).toBe("Original");
  });

  it("is 200 for the author, and the edit lands", async () => {
    const submission = await createSubmission(owner.id, { title: "Original" });
    const edit = validEdit();

    const res = await put(submission.id, owner.authorization, edit);

    expect(res.status).toBe(200);
    expect(await titleOf(submission.id)).toBe(edit.title);
  });

  it("is 404 for an id that does not exist, for the author and for anyone else alike", async () => {
    const asOwner = await put(MISSING_ID, owner.authorization, validEdit());
    const asOutsider = await put(
      MISSING_ID,
      outsider.authorization,
      validEdit(),
    );

    expect(asOwner.status).toBe(404);
    expect(asOutsider.status).toBe(404);
    expect(asOutsider.body.error.code).toBe("NOT_FOUND");
  });

  it("tells a visitor 401 about an id that does not exist, so a session is asked for first", async () => {
    const res = await put(MISSING_ID, undefined, validEdit());

    expect(res.status).toBe(401);
  });

  it("tells a non-owner 403, not 400, even when the repository URL they sent is invalid", async () => {
    const submission = await createSubmission(owner.id);

    const res = await put(submission.id, outsider.authorization, {
      ...validEdit(),
      githubUrl: "http://github.com/o/r",
    });

    // Someone who may not edit this submission learns nothing from how well
    // their request was formed.
    expect(res.status).toBe(403);
  });
});

describe("POST /submissions/:id/reviews", () => {
  let owner: Actor;
  let reviewer: Actor;

  beforeAll(async () => {
    owner = await actAs("a");
    reviewer = await actAs("b");
  });

  const post = (id: number, authorization: string | undefined, body: object) =>
    withAuth(
      request(app).post(`/api/v1/submissions/${id}/reviews`),
      authorization,
    ).send(body);

  const karmaOf = async (id: number) =>
    (
      await prisma.user.findUniqueOrThrow({
        where: { id },
        select: { karma: true },
      })
    ).karma;

  const reviewsOn = (submissionId: number) =>
    prisma.review.count({ where: { submissionId } });

  it("is 401 for a visitor, and nothing is created", async () => {
    const submission = await createSubmission(owner.id);

    const res = await post(submission.id, undefined, validReview(submission));

    expect(res.status).toBe(401);
    expect(await reviewsOn(submission.id)).toBe(0);
  });

  it("is 403 for the author reviewing their own submission, and no karma is paid", async () => {
    const submission = await createSubmission(owner.id);
    const before = await karmaOf(owner.id);

    const res = await post(
      submission.id,
      owner.authorization,
      validReview(submission),
    );

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await reviewsOn(submission.id)).toBe(0);
    expect(await karmaOf(owner.id)).toBe(before);
  });

  it("is 201 for another signed-in user, and the review and the karma both land", async () => {
    const submission = await createSubmission(owner.id);
    const before = await karmaOf(reviewer.id);

    const res = await post(
      submission.id,
      reviewer.authorization,
      validReview(submission),
    );

    expect(res.status).toBe(201);
    expect(await reviewsOn(submission.id)).toBe(1);
    expect(await karmaOf(reviewer.id)).toBe(before + KARMA_PER_REVIEW);
  });

  it("is 404 for an id that does not exist, and no karma is paid", async () => {
    const submission = await createSubmission(owner.id);
    const before = await karmaOf(reviewer.id);

    const res = await post(
      MISSING_ID,
      reviewer.authorization,
      validReview(submission),
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(await karmaOf(reviewer.id)).toBe(before);
  });
});

describe("GET /submissions/:id", () => {
  let owner: Actor;
  let outsider: Actor;

  beforeAll(async () => {
    owner = await actAs("a");
    outsider = await actAs("b");
  });

  it("is public: a visitor, a user and the author all get the same submission", async () => {
    const submission = await createSubmission(owner.id);
    const path = `/api/v1/submissions/${submission.id}`;

    const visitor = await request(app).get(path);
    const user = await request(app)
      .get(path)
      .set("Authorization", outsider.authorization);
    const author = await request(app)
      .get(path)
      .set("Authorization", owner.authorization);

    expect([visitor.status, user.status, author.status]).toEqual([
      200, 200, 200,
    ]);
    expect(user.body).toEqual(visitor.body);
    expect(author.body).toEqual(visitor.body);
  });

  it("is 404 for an id that does not exist, whoever asks", async () => {
    const path = `/api/v1/submissions/${MISSING_ID}`;

    const visitor = await request(app).get(path);
    const user = await request(app)
      .get(path)
      .set("Authorization", outsider.authorization);

    expect(visitor.status).toBe(404);
    expect(user.status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5"])(
    "is 400 for an id that could never exist: %s",
    async (id) => {
      const res = await request(app).get(`/api/v1/submissions/${id}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    },
  );
});
