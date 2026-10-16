import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { actAs } from "./auth.js";
import { createSubmission, unique } from "./fixtures.js";

// GET /feed/personalized with a real session. The ranking itself is tested
// through the service in feedPersonalized.test.ts and to ten decimal places in
// the unit tests. What is checked here is the route: the session reaches the
// service, the response has the right shape, the debug flag behaves, and
// nothing about it can be cached.
//
// Every submission here carries a unique tag that only the viewer's stack
// shares, so it ranks first however much other files have left in the shared
// database, and no test depends on where anything else landed.

const app = createApp();

const getAs = (authorization: string, query = "") =>
  request(app)
    .get(`/api/v1/feed/personalized${query}`)
    .set("Authorization", authorization);

// A viewer whose whole stack is one tag, and a submission by someone else that
// carries it.
const viewerAndMatch = async () => {
  const tag = unique("tag");
  const author = await actAs("a");
  const submission = await createSubmission(author.id, {
    technologies: [tag, unique("tag")],
  });
  const viewer = await actAs("b");
  await prisma.user.update({
    where: { id: viewer.id },
    data: { technologies: { connect: [{ name: tag }] } },
  });
  return { tag, author, viewer, submission };
};

describe("GET /feed/personalized with a session", () => {
  it("ranks a matching submission first and reports why, in the feed item shape", async () => {
    const { tag, author, viewer, submission } = await viewerAndMatch();

    const res = await getAs(viewer.authorization);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const first = res.body.data[0];
    expect(first.id).toBe(submission.id);
    expect(first.matchedTechnologies).toEqual([tag]);
    expect(first.author.username).toBe(author.username);
    expect(Object.keys(first).sort()).toEqual([
      "author",
      "createdAt",
      "description",
      "githubUrl",
      "id",
      "matchedTechnologies",
      "reviewCount",
      "status",
      "technologies",
      "title",
    ]);
    expect(res.body.meta).toMatchObject({ currentPage: 1, itemsPerPage: 20 });
  });

  it("is never cached, since it is different for every person", async () => {
    const { viewer } = await viewerAndMatch();

    const res = await getAs(viewer.authorization);

    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("does not offer the viewer their own submissions", async () => {
    const tag = unique("tag");
    const viewer = await actAs("a");
    const own = await createSubmission(viewer.id, { technologies: [tag] });
    await prisma.user.update({
      where: { id: viewer.id },
      data: { technologies: { connect: [{ name: tag }] } },
    });

    const res = await getAs(viewer.authorization);

    // The submission matches the viewer's stack exactly, so it would be first
    // if it were offered at all.
    expect(res.status).toBe(200);
    expect(
      res.body.data.some((item: { id: number }) => item.id === own.id),
    ).toBe(false);
  });

  it("shows the score breakdown only when ?debug=1 is sent outside production", async () => {
    const { viewer } = await viewerAndMatch();

    const plain = await getAs(viewer.authorization);
    const debug = await getAs(viewer.authorization, "?debug=1");

    expect(plain.body.data[0]).not.toHaveProperty("_score");
    expect(Object.keys(debug.body.data[0]._score).sort()).toEqual([
      "final",
      "recency",
      "tag",
    ]);
  });

  it.each([
    ["debug=true", "a debug value other than 1"],
    ["search=react", "a search, which only the public feed has"],
    [
      "technologies=react",
      "a technology filter, which only the public feed has",
    ],
    ["limit=51", "a limit over 50"],
    ["page=0", "page zero"],
  ])("rejects %s (%s) with VALIDATION_ERROR", async (query) => {
    const viewer = await actAs("a");

    const res = await getAs(viewer.authorization, `?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
