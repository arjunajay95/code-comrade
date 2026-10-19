import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { actAs } from "./auth.js";
import { createReview, createSubmission } from "./fixtures.js";

// The three lists under /users/me. Each is scoped to one user, so nothing here
// depends on what other files left in the shared database. They live apart
// from users.test.ts because every file has its own budget of 100 requests
// under the global rate limiter, and keeping them apart leaves both well
// inside it.

const app = createApp();

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);

const getAs = (authorization: string, path: string) =>
  request(app).get(`/api/v1${path}`).set("Authorization", authorization);

const keysOf = (value: object) => Object.keys(value).sort();

describe("the lists under /users/me", () => {
  it("lists only my submissions, newest first, with the review count", async () => {
    const me = await actAs("a");
    const other = await actAs("b");
    const oldest = await createSubmission(me.id, { createdAt: hoursAgo(3) });
    const middle = await createSubmission(me.id, { createdAt: hoursAgo(2) });
    const newest = await createSubmission(me.id, { createdAt: hoursAgo(1) });
    await createSubmission(other.id);
    await createReview(newest, other.id, [4, 4]);

    const res = await getAs(me.authorization, "/users/me/submissions");

    expect(res.status).toBe(200);
    expect(res.body.data.map((item: { id: number }) => item.id)).toEqual([
      newest.id,
      middle.id,
      oldest.id,
    ]);
    expect(res.body.meta).toEqual({
      totalItems: 3,
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 20,
    });
    expect(keysOf(res.body.data[0])).toEqual([
      "createdAt",
      "description",
      "githubUrl",
      "id",
      "reviewCount",
      "technologies",
      "title",
    ]);
    expect(typeof res.body.data[0].description).toBe("string");
    expect(res.body.data[0].reviewCount).toBe(1);
    expect(res.body.data[1].reviewCount).toBe(0);
  });

  it("pages without overlap and reports the page count", async () => {
    const me = await actAs("a");
    const oldest = await createSubmission(me.id, { createdAt: hoursAgo(3) });
    const middle = await createSubmission(me.id, { createdAt: hoursAgo(2) });
    const newest = await createSubmission(me.id, { createdAt: hoursAgo(1) });

    const first = await getAs(
      me.authorization,
      "/users/me/submissions?limit=2&page=1",
    );
    const second = await getAs(
      me.authorization,
      "/users/me/submissions?limit=2&page=2",
    );

    expect(first.body.data.map((i: { id: number }) => i.id)).toEqual([
      newest.id,
      middle.id,
    ]);
    expect(second.body.data.map((i: { id: number }) => i.id)).toEqual([
      oldest.id,
    ]);
    expect(first.body.meta).toMatchObject({
      totalItems: 3,
      totalPages: 2,
      itemsPerPage: 2,
    });
  });

  it("lists the reviews I wrote, newest first, and none written by anyone else", async () => {
    const me = await actAs("a");
    const other = await actAs("b");
    const first = await createSubmission(other.id, {
      criteria: ["Clarity", "Tests"],
    });
    const second = await createSubmission(other.id);
    const mine = await createSubmission(me.id);
    await createReview(first, me.id, [5, 3], hoursAgo(2));
    await createReview(second, me.id, [4, 4], hoursAgo(1));
    await createReview(mine, other.id, [2, 2]);

    const res = await getAs(me.authorization, "/users/me/reviews");

    expect(res.status).toBe(200);
    expect(
      res.body.data.map(
        (item: { submission: { id: number } }) => item.submission.id,
      ),
    ).toEqual([second.id, first.id]);
    expect(res.body.meta.totalItems).toBe(2);
    const reviewOfFirst = res.body.data[1];
    expect(keysOf(reviewOfFirst)).toEqual([
      "createdAt",
      "feedback",
      "id",
      "ratings",
      "reviewer",
      "submission",
    ]);
    expect(reviewOfFirst).toMatchObject({
      reviewer: me.username,
      submission: { id: first.id, author: other.username },
      ratings: [
        { criterion: "Clarity", rating: 5 },
        { criterion: "Tests", rating: 3 },
      ],
    });
    expect(keysOf(reviewOfFirst.submission)).toEqual(["author", "id", "title"]);
  });

  it("lists the reviews other people wrote on my submissions, and not the ones I wrote", async () => {
    const me = await actAs("a");
    const other = await actAs("b");
    const mineOne = await createSubmission(me.id);
    const mineTwo = await createSubmission(me.id);
    const theirs = await createSubmission(other.id);
    await createReview(mineOne, other.id, [4, 4], hoursAgo(2));
    await createReview(mineTwo, other.id, [3, 5], hoursAgo(1));
    await createReview(theirs, me.id, [5, 5]);

    const res = await getAs(me.authorization, "/users/me/reviews-received");

    expect(res.status).toBe(200);
    expect(
      res.body.data.map(
        (item: { submission: { id: number } }) => item.submission.id,
      ),
    ).toEqual([mineTwo.id, mineOne.id]);
    expect(
      res.body.data.every(
        (item: { reviewer: string }) => item.reviewer === other.username,
      ),
    ).toBe(true);
    expect(res.body.meta.totalItems).toBe(2);
  });

  it.each(["submissions", "reviews", "reviews-received"])(
    "/users/me/%s is empty for someone with nothing yet, and says so in the meta",
    async (list) => {
      const me = await actAs("a");

      const res = await getAs(me.authorization, `/users/me/${list}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({
        totalItems: 0,
        currentPage: 1,
        totalPages: 0,
        itemsPerPage: 20,
      });
    },
  );

  it.each(["submissions", "reviews", "reviews-received"])(
    "/users/me/%s rejects a limit over 50, page 0 and an unknown parameter",
    async (list) => {
      const me = await actAs("a");

      for (const query of ["limit=51", "page=0", "sort=title"]) {
        const res = await getAs(me.authorization, `/users/me/${list}?${query}`);
        expect(res.status, query).toBe(400);
        expect(res.body.error.code, query).toBe("VALIDATION_ERROR");
      }
    },
  );
});
