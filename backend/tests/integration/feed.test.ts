import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  createReview,
  createSubmission,
  createUser,
  unique,
} from "./fixtures.js";

const app = createApp();

// Other test files create submissions in the same database. Each test here
// tags its own submissions with a unique technology and filters by it, so it
// only ever sees its own rows.
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);
const ids = (res: request.Response) =>
  res.body.data.map((item: { id: number }) => item.id);

describe("GET /feed", () => {
  it("lists newest first and pages without overlap", async () => {
    const tag = unique("tag");
    const author = await createUser();
    const oldest = await createSubmission(author.id, {
      technologies: [tag],
      createdAt: hoursAgo(30),
    });
    const middle = await createSubmission(author.id, {
      technologies: [tag],
      createdAt: hoursAgo(20),
    });
    const newest = await createSubmission(author.id, {
      technologies: [tag],
      createdAt: hoursAgo(10),
    });

    const page1 = await request(app).get(
      `/api/v1/feed?technologies=${tag}&limit=2&page=1`,
    );
    const page2 = await request(app).get(
      `/api/v1/feed?technologies=${tag}&limit=2&page=2`,
    );

    expect(ids(page1)).toEqual([newest.id, middle.id]);
    expect(ids(page2)).toEqual([oldest.id]);
    expect(page1.body.meta).toMatchObject({
      totalItems: 3,
      totalPages: 2,
      itemsPerPage: 2,
    });
  });

  it("filters by any of the listed technologies, ignoring case", async () => {
    const [tagA, tagB, tagC] = [unique("tag"), unique("tag"), unique("tag")];
    const author = await createUser();
    const a = await createSubmission(author.id, { technologies: [tagA] });
    const b = await createSubmission(author.id, { technologies: [tagB] });
    await createSubmission(author.id, { technologies: [tagC] });

    const res = await request(app).get(
      `/api/v1/feed?technologies=${tagA.toUpperCase()},${tagB}`,
    );

    expect(ids(res).sort()).toEqual([a.id, b.id].sort());
  });

  it("searches titles and descriptions, ignoring case", async () => {
    const word = unique("word");
    const author = await createUser();
    const inTitle = await createSubmission(author.id, {
      title: `Project ${word}`,
    });
    const inDescription = await createSubmission(author.id, {
      description: `Uses ${word} heavily`,
    });
    await createSubmission(author.id, { title: "Unrelated" });

    const res = await request(app).get(
      `/api/v1/feed?search=${word.toUpperCase()}`,
    );

    expect(ids(res).sort()).toEqual([inTitle.id, inDescription.id].sort());
  });

  it("shows derived status, review count and author, and no Clerk id", async () => {
    const tag = unique("tag");
    const author = await createUser();
    const reviewer = await createUser();
    const submission = await createSubmission(author.id, {
      technologies: [tag],
    });
    await createReview(submission, reviewer.id, [4]);

    const res = await request(app).get(`/api/v1/feed?technologies=${tag}`);

    expect(res.body.data[0]).toMatchObject({
      status: "REVIEWED",
      reviewCount: 1,
      author: { username: author.username },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/clerk/i);
  });

  it("rejects invalid query parameters", async () => {
    for (const query of [
      "limit=51",
      "technologies=",
      "search=",
      "sort=title",
    ]) {
      const res = await request(app).get(`/api/v1/feed?${query}`);
      expect(res.status, query).toBe(400);
    }
  });
});
