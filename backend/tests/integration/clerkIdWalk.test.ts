import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { registeredRoutes } from "../../src/routes/registry.js";
import { actAs, type Actor } from "./auth.js";
import { createReview, createSubmission, unique } from "./fixtures.js";

// D-08: clerkId never appears in any response. This walks every endpoint the
// app registers, sends a request that returns real data and one that is
// refused, serializes each response, and checks the text for the field name
// and for the Clerk identity of every user involved. Written as an allowlist
// problem: nothing here says what a response may contain, only that this one
// thing it may never contain, whatever a future select or spread adds.
//
// The walk has an entry for every registered route, and a test fails when a
// route is added without one, so a new endpoint cannot skip the check.

const app = createApp();

// Nothing the walk sends contains the word it searches for. A response repeats
// what it was sent: a description or a validation message that quotes an
// unknown field would put "clerkId" in a body for a reason that is no leak.
interface Context {
  owner: Actor;
  reviewer: Actor;
  submissionId: number;
  criteria: { id: number }[];
}

type Send = (context: Context) => request.Test;

const as = (req: request.Test, actor: Actor) =>
  req.set("Authorization", actor.authorization);

const body = (context: Context) => ({
  feedback: "A review sent by the identity walk, long enough to be accepted.",
  ratings: context.criteria.map((criterion) => ({
    criterionId: criterion.id,
    rating: 4,
  })),
});

// One request per route that succeeds with real data in the response, from the
// actor best placed to see the most of it.
const SUCCESS: Record<string, Send> = {
  "GET /health/live": () => request(app).get("/api/v1/health/live"),
  "GET /health/ready": () => request(app).get("/api/v1/health/ready"),
  "GET /feed": () => request(app).get("/api/v1/feed?limit=50"),
  "GET /feed/personalized": (c) =>
    as(request(app).get("/api/v1/feed/personalized?debug=1"), c.reviewer),
  "GET /submissions/:id": (c) =>
    request(app).get(`/api/v1/submissions/${c.submissionId}`),
  "POST /submissions": (c) =>
    as(request(app).post("/api/v1/submissions"), c.owner).send({
      title: unique("walk"),
      description: "A submission posted by the identity walk.",
      githubUrl: "https://github.com/walk-owner/walk-repo",
      criteria: [{ label: "Readability" }],
      technologies: [unique("tag")],
    }),
  "PUT /submissions/:id": (c) =>
    as(request(app).put(`/api/v1/submissions/${c.submissionId}`), c.owner).send(
      {
        title: unique("walk"),
        description: "An edit made by the identity walk.",
        githubUrl: "https://github.com/walk-owner/walk-repo",
        technologies: [unique("tag")],
      },
    ),
  "POST /submissions/:id/reviews": (c) =>
    as(
      request(app).post(`/api/v1/submissions/${c.submissionId}/reviews`),
      c.reviewer,
    ).send(body(c)),
  "GET /users/me": (c) => as(request(app).get("/api/v1/users/me"), c.owner),
  "GET /users/me/submissions": (c) =>
    as(request(app).get("/api/v1/users/me/submissions"), c.owner),
  "GET /users/me/reviews": (c) =>
    as(request(app).get("/api/v1/users/me/reviews"), c.reviewer),
  "GET /users/me/reviews-received": (c) =>
    as(request(app).get("/api/v1/users/me/reviews-received"), c.owner),
  "PATCH /users/me": (c) =>
    as(request(app).patch("/api/v1/users/me"), c.owner).send({
      bio: "Set by the identity walk.",
    }),
  "GET /users/:username": (c) =>
    request(app).get(`/api/v1/users/${c.owner.username}`),
  "GET /technologies": () => request(app).get("/api/v1/technologies?limit=50"),
};

// The same walk for the error responses, since an error body is a response
// too. Routes that cannot be refused have no entry here.
const REFUSED: Record<string, Send> = {
  "GET /feed/personalized": () => request(app).get("/api/v1/feed/personalized"),
  "GET /submissions/:id": () =>
    request(app).get("/api/v1/submissions/2000000000"),
  "POST /submissions": (c) =>
    as(request(app).post("/api/v1/submissions"), c.owner).send({}),
  "PUT /submissions/:id": (c) =>
    as(
      request(app).put(`/api/v1/submissions/${c.submissionId}`),
      c.reviewer,
    ).send({
      title: "Not yours",
      description: "An edit by someone who is not the author.",
      githubUrl: "https://github.com/o/r",
      technologies: ["x"],
    }),
  "POST /submissions/:id/reviews": (c) =>
    as(
      request(app).post(`/api/v1/submissions/${c.submissionId}/reviews`),
      c.owner,
    ).send(body(c)),
  "GET /users/me": () => request(app).get("/api/v1/users/me"),
  "GET /users/me/submissions": () =>
    request(app).get("/api/v1/users/me/submissions"),
  "GET /users/me/reviews": () => request(app).get("/api/v1/users/me/reviews"),
  "GET /users/me/reviews-received": () =>
    request(app).get("/api/v1/users/me/reviews-received"),
  "PATCH /users/me": (c) =>
    as(request(app).patch("/api/v1/users/me"), c.owner).send({}),
  "GET /users/:username": () =>
    request(app).get(`/api/v1/users/${unique("nobody")}`),
};

describe("clerkId never appears in a response (D-08)", () => {
  let context: Context;
  // Everything that would identify a Clerk account: the field name and the id
  // of every user the walk involves.
  let forbidden: string[];

  beforeAll(async () => {
    const owner = await actAs("a");
    const reviewer = await actAs("b");
    const submission = await createSubmission(owner.id, {
      criteria: ["Readability", "Structure"],
      technologies: [unique("tag")],
    });
    // Reviews in both directions, so the lists have nested people in them.
    await createReview(submission, reviewer.id, [4, 5]);
    const theirs = await createSubmission(reviewer.id);
    await createReview(theirs, owner.id, [3, 3]);
    // The submission the walk reviews, so the review route has real work to do.
    const target = await createSubmission(owner.id, {
      criteria: ["Readability", "Structure"],
    });
    context = {
      owner,
      reviewer,
      submissionId: target.id,
      criteria: target.criteria,
    };

    const users = await prisma.user.findMany({
      where: { id: { in: [owner.id, reviewer.id] } },
      select: { clerkId: true },
    });
    forbidden = ["clerkId", "clerk_id", ...users.map((user) => user.clerkId)];
  });

  const check = (res: request.Response) => {
    const text = `${res.text}${JSON.stringify(res.body)}`;
    for (const needle of forbidden) {
      expect(text, `the response contains ${needle}`).not.toContain(needle);
    }
    // Real Clerk user ids look like user_ followed by a long run of letters
    // and digits. Nothing shaped like one belongs in a body.
    expect(text).not.toMatch(/\buser_[A-Za-z0-9]{20,}\b/);
  };

  const registered = () =>
    registeredRoutes.map(
      (route) => `${route.method.toUpperCase()} ${route.path}`,
    );

  it("has a walk entry for every route the app registers, and for no route it does not", () => {
    expect(Object.keys(SUCCESS).sort()).toEqual([...registered()].sort());
  });

  it.each(Object.entries(SUCCESS))(
    "%s, when it succeeds",
    async (_route, send) => {
      const res = await send(context);

      expect(res.status).toBeLessThan(300);
      expect(res.text.length).toBeGreaterThan(0);
      check(res);
    },
  );

  it.each(Object.entries(REFUSED))(
    "%s, when it is refused",
    async (_route, send) => {
      const res = await send(context);

      expect(res.status).toBeGreaterThanOrEqual(400);
      check(res);
    },
  );

  it("looks for what it claims to: a response that did contain one would fail", () => {
    const leaking = {
      text: JSON.stringify({
        data: { id: 1, clerkId: "user_2abcdefghijklmnopqrstuvwxyz" },
      }),
      body: { data: { clerkId: "user_2abcdefghijklmnopqrstuvwxyz" } },
    } as unknown as request.Response;

    expect(() => check(leaking)).toThrow();
  });
});
