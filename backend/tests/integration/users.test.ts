import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { actAs } from "./auth.js";
import { createReview, createSubmission, unique } from "./fixtures.js";

// The users endpoints, which before this file had no automated tests beyond
// the sign-in and the D-10 rows. Each test makes its own users, and every list
// here is scoped to one user, so nothing depends on what other files left in
// the shared database.

const app = createApp();

const getAs = (authorization: string, path: string) =>
  request(app).get(`/api/v1${path}`).set("Authorization", authorization);

const patchAs = (authorization: string, body: unknown) =>
  request(app)
    .patch("/api/v1/users/me")
    .set("Authorization", authorization)
    .send(body as object);

const keysOf = (value: object) => Object.keys(value).sort();

const names = (technologies: { name: string }[]) =>
  technologies.map((technology) => technology.name);

describe("GET /users/me", () => {
  it("returns the profile and the counts, and exactly those fields", async () => {
    const me = await actAs("a");
    const other = await actAs("b");
    const mine = await createSubmission(me.id);
    await createSubmission(me.id);
    const theirs = await createSubmission(other.id);
    await createReview(mine, other.id, [4, 5]);
    await createReview(theirs, me.id, [3, 3]);

    const res = await getAs(me.authorization, "/users/me");

    expect(res.status).toBe(200);
    expect(keysOf(res.body.data)).toEqual([
      "bio",
      "createdAt",
      "id",
      "karma",
      "stats",
      "technologies",
      "username",
    ]);
    expect(res.body.data).toMatchObject({
      id: me.id,
      username: me.username,
      bio: null,
      // Two points for the one review I wrote. Reviews on my own work earn
      // me nothing.
      karma: 2,
      technologies: [],
      stats: { submissions: 2, reviewsGiven: 1, reviewsReceived: 1 },
    });
    expect(keysOf(res.body.data.stats)).toEqual([
      "reviewsGiven",
      "reviewsReceived",
      "submissions",
    ]);
  });

  it("rejects a query parameter instead of ignoring it", async () => {
    const me = await actAs("a");

    const res = await getAs(me.authorization, "/users/me?verbose=1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /users/me", () => {
  it("changes the username, normalized, and returns the same shape as GET /users/me", async () => {
    const me = await actAs("a");
    const wanted = unique("renamed");

    const res = await patchAs(me.authorization, {
      username: `  ${wanted.toUpperCase()}  `,
    });
    const after = await getAs(me.authorization, "/users/me");

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(wanted);
    expect(res.body.data).toEqual(after.body.data);
  });

  it("allows keeping the username it already has", async () => {
    const me = await actAs("a");

    const res = await patchAs(me.authorization, { username: me.username });

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(me.username);
  });

  it("refuses a username another user has, however it is spelled, and changes nothing", async () => {
    const taken = await actAs("a");
    const me = await actAs("b");

    const res = await patchAs(me.authorization, {
      username: taken.username.toUpperCase(),
      bio: "This should not be saved.",
    });
    const after = await getAs(me.authorization, "/users/me");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(after.body.data.username).toBe(me.username);
    expect(after.body.data.bio).toBeNull();
  });

  it("sets the bio trimmed, and clears it with an empty string or null", async () => {
    const me = await actAs("a");

    const set = await patchAs(me.authorization, {
      bio: "  Backend developer.  ",
    });
    const emptied = await patchAs(me.authorization, { bio: "   " });
    await patchAs(me.authorization, { bio: "Back again." });
    const nulled = await patchAs(me.authorization, { bio: null });

    expect(set.body.data.bio).toBe("Backend developer.");
    expect(emptied.body.data.bio).toBeNull();
    expect(nulled.body.data.bio).toBeNull();
  });

  it("replaces the whole technology stack, normalized, and creates new tags", async () => {
    const me = await actAs("a");
    const [first, second, third] = [
      unique("tag"),
      unique("tag"),
      unique("tag"),
    ];

    const added = await patchAs(me.authorization, {
      technologies: [first.toUpperCase(), ` ${first} `, second],
    });
    const replaced = await patchAs(me.authorization, { technologies: [third] });
    const cleared = await patchAs(me.authorization, { technologies: [] });

    // Sorted by name, with the duplicate spellings of the first tag gone.
    expect(names(added.body.data.technologies)).toEqual([first, second].sort());
    expect(names(replaced.body.data.technologies)).toEqual([third]);
    expect(cleared.body.data.technologies).toEqual([]);
    // Replacing the stack does not delete the tags themselves.
    expect(await prisma.technology.count({ where: { name: first } })).toBe(1);
    expect(await prisma.technology.count({ where: { name: second } })).toBe(1);
  });

  it("leaves the fields it was not sent exactly as they were", async () => {
    const me = await actAs("a");
    const tag = unique("tag");
    await patchAs(me.authorization, {
      bio: "Original bio.",
      technologies: [tag],
    });

    const res = await patchAs(me.authorization, {
      bio: "Only the bio changed.",
    });

    expect(res.body.data).toMatchObject({
      username: me.username,
      bio: "Only the bio changed.",
    });
    expect(names(res.body.data.technologies)).toEqual([tag]);
  });

  it("creates a tag once when two users add it at the same moment", async () => {
    const first = await actAs("a");
    const second = await actAs("b");
    const tag = unique("race");

    const [one, two] = await Promise.all([
      patchAs(first.authorization, { technologies: [tag] }),
      patchAs(second.authorization, { technologies: [tag] }),
    ]);

    expect([one.status, two.status]).toEqual([200, 200]);
    expect(await prisma.technology.count({ where: { name: tag } })).toBe(1);
  });

  it("rolls back a new tag when the same request's username is refused", async () => {
    const taken = await actAs("a");
    const me = await actAs("b");
    const tag = unique("rolledback");

    const res = await patchAs(me.authorization, {
      username: taken.username,
      technologies: [tag],
    });

    expect(res.status).toBe(409);
    expect(await prisma.technology.count({ where: { name: tag } })).toBe(0);
  });

  it("accepts a stack of twenty and refuses twenty-one", async () => {
    const me = await actAs("a");
    const tags = Array.from({ length: 21 }, () => unique("many"));

    const twenty = await patchAs(me.authorization, {
      technologies: tags.slice(0, 20),
    });
    const twentyOne = await patchAs(me.authorization, { technologies: tags });

    expect(twenty.status).toBe(200);
    expect(twenty.body.data.technologies).toHaveLength(20);
    expect(twentyOne.status).toBe(400);
  });

  it.each<[string, Record<string, unknown>]>([
    ["an empty body", {}],
    ["a field that is not editable: karma", { karma: 100 }],
    ["a field that is not editable: clerkId", { clerkId: "user_stolen" }],
    ["a field that is not editable: id", { id: 1 }],
    ["a reserved username", { username: "admin" }],
    ["a username with a space and punctuation", { username: "Bad Name!" }],
    ["a username that is too short", { username: "ab" }],
    ["a username that is too long", { username: "a".repeat(31) }],
    ["a bio over 500 characters", { bio: "x".repeat(501) }],
    ["a bio that is not text", { bio: 12345 }],
    [
      "a technology name over 40 characters",
      { technologies: ["x".repeat(41)] },
    ],
    ["technologies that are not a list", { technologies: "react" }],
  ])(
    "rejects %s with VALIDATION_ERROR and changes nothing",
    async (_name, body) => {
      const me = await actAs("a");

      const res = await patchAs(me.authorization, body);
      const after = await getAs(me.authorization, "/users/me");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      // A new user starts with no bio, no stack and no karma, so "unchanged"
      // can be stated outright.
      expect(after.body.data).toMatchObject({
        username: me.username,
        bio: null,
        karma: 0,
        technologies: [],
      });
    },
  );
});

describe("GET /users/:username", () => {
  it("is public, and shows exactly the public fields: no id", async () => {
    const owner = await actAs("a");
    const reviewer = await actAs("b");
    const tags = [unique("tag"), unique("tag")];
    await patchAs(owner.authorization, {
      bio: "Public bio.",
      technologies: tags,
    });
    const submission = await createSubmission(owner.id);
    await createReview(submission, reviewer.id, [4, 4]);

    const res = await request(app).get(`/api/v1/users/${owner.username}`);

    expect(res.status).toBe(200);
    expect(keysOf(res.body.data)).toEqual([
      "bio",
      "createdAt",
      "karma",
      "stats",
      "technologies",
      "username",
    ]);
    expect(res.body.data).toMatchObject({
      username: owner.username,
      bio: "Public bio.",
      karma: 0,
      stats: { submissions: 1, reviewsGiven: 0, reviewsReceived: 1 },
    });
    expect(names(res.body.data.technologies)).toEqual([...tags].sort());
  });

  it("finds a user whatever case the username is written in", async () => {
    const owner = await actAs("a");

    const res = await request(app).get(
      `/api/v1/users/${owner.username.toUpperCase()}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(owner.username);
  });

  it.each(["bad!name", "ab", "a".repeat(31)])(
    "rejects %j, which could never be a username, with 400 before the database",
    async (username) => {
      const res = await request(app).get(
        `/api/v1/users/${encodeURIComponent(username)}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    },
  );
});
