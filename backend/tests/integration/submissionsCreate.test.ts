import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { submissionRepository } from "../../src/repository/submission.repository.js";
import { actAs, type Actor } from "./auth.js";
import { createSubmission, unique } from "./fixtures.js";

const app = createApp();

// A complete, valid request body. Each test starts from this and changes only
// what it is about. The technology is unique per call, so two tests never
// share a tag by accident.
const validBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Dashboard UI kit",
  description: "A small component library, looking for feedback on structure.",
  githubUrl: "https://github.com/alice-frontend/dashboard-ui",
  criteria: [{ label: "Readability" }, { label: "Structure" }],
  technologies: [unique("tag")],
  ...overrides,
});

const post = (authorization: string | undefined, body: unknown) => {
  const req = request(app).post("/api/v1/submissions");
  if (authorization) req.set("Authorization", authorization);
  return req.send(body as object);
};

describe("POST /submissions", () => {
  let author: Actor;

  const countByAuthor = () =>
    prisma.submission.count({ where: { authorId: author.id } });

  beforeAll(async () => {
    author = await actAs("a");
  });

  it("rejects a request with no session", async () => {
    const before = await countByAuthor();

    const res = await post(undefined, validBody());

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(await countByAuthor()).toBe(before);
  });

  describe("with a valid body", () => {
    const firstTag = unique("aaa");
    const secondTag = unique("zzz");
    let res: Awaited<ReturnType<typeof post>>;

    beforeAll(async () => {
      // Sent in the wrong order, in the wrong case and with padding, so the
      // response shows the tags came back normalized and sorted.
      res = await post(
        author.authorization,
        validBody({ technologies: [secondTag.toUpperCase(), ` ${firstTag} `] }),
      );
    });

    it("returns 201 with the submission in the detail shape", () => {
      const data = res.body.data;

      expect(res.status).toBe(201);
      expect(data).toMatchObject({
        title: "Dashboard UI kit",
        githubUrl: "https://github.com/alice-frontend/dashboard-ui",
        status: "PENDING",
        reviewCount: 0,
        reviews: [],
        repository: null,
        author: { username: author.username, karma: 0 },
      });
      expect(data.criteria.map((c: { label: string }) => c.label)).toEqual([
        "Readability",
        "Structure",
      ]);
      expect(
        data.criteria.every(
          (c: { averageRating: number | null }) => c.averageRating === null,
        ),
      ).toBe(true);
      expect(data.technologies.map((t: { name: string }) => t.name)).toEqual([
        firstTag,
        secondTag,
      ]);
      // D-08: no Clerk identifier anywhere in the body.
      expect(JSON.stringify(res.body)).not.toMatch(/clerk/i);
    });

    it("matches what GET /submissions/:id returns for it", async () => {
      const detail = await request(app).get(
        `/api/v1/submissions/${res.body.data.id}`,
      );

      expect(detail.status).toBe(200);
      expect(detail.body.data).toEqual(res.body.data);
    });

    it("stores the owner and repository as columns that agree with the URL (V-Q7)", async () => {
      const row = await prisma.submission.findUniqueOrThrow({
        where: { id: res.body.data.id },
      });

      expect(row.githubOwner).toBe("alice-frontend");
      expect(row.githubRepo).toBe("dashboard-ui");
      expect(row.githubUrl).toBe(
        `https://github.com/${row.githubOwner}/${row.githubRepo}`,
      );
      expect(row.authorId).toBe(author.id);
    });

    it("mints no karma, since karma comes from reviews only (INV-1)", async () => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: author.id },
      });

      expect(user.karma).toBe(0);
    });

    it("shows up in the author's own profile stats", async () => {
      const me = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", author.authorization);

      const count = await countByAuthor();
      expect(me.status).toBe(200);
      expect(count).toBeGreaterThan(0);
      expect(me.body.data.stats.submissions).toBe(count);
    });
  });

  it("trims text and accepts a URL pasted with surrounding whitespace", async () => {
    const res = await post(
      author.authorization,
      validBody({
        title: "  Padded title  ",
        githubUrl: " https://github.com/o-ws/r-ws\n",
      }),
    );

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Padded title");
    expect(res.body.data.githubUrl).toBe("https://github.com/o-ws/r-ws");
  });

  // The parser has its own unit tests with the full T-11 list. These check
  // that the service maps a rejection to the right code.
  it.each([
    ["http://github.com/o/r", "the wrong scheme"],
    ["https://github.com.evil.example/o/r", "a suffix host"],
    ["https://github.com/o/r.git", "a clone URL"],
    ["https://GitHub.com/o/r", "an uppercase host"],
    ["https://github.com/o/r/", "a trailing slash"],
    ["", "an empty string"],
  ])(
    "answers %j with INVALID_REPO_URL, not VALIDATION_ERROR (%s)",
    async (githubUrl) => {
      const before = await countByAuthor();

      const res = await post(author.authorization, validBody({ githubUrl }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_REPO_URL");
      expect(await countByAuthor()).toBe(before);
    },
  );

  // The schema has its own unit tests for every limit. These check that the
  // validate middleware is wired to this route and names the failing field.
  it.each<[string, Record<string, unknown>, string]>([
    ["a missing title", { title: undefined }, "body.title"],
    ["an authorId field", { authorId: 1 }, "body"],
    [
      "duplicate criterion labels",
      { criteria: [{ label: "Readability" }, { label: "readability" }] },
      "body.criteria",
    ],
  ])("rejects %s with VALIDATION_ERROR", async (_name, overrides, path) => {
    const before = await countByAuthor();

    const res = await post(author.authorization, validBody(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain(path);
    expect(await countByAuthor()).toBe(before);
  });

  it("rejects a body that is not valid JSON", async () => {
    const res = await request(app)
      .post("/api/v1/submissions")
      .set("Authorization", author.authorization)
      .set("Content-Type", "application/json")
      .send("{ not json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a body over the size limit with 413", async () => {
    const res = await post(
      author.authorization,
      validBody({ description: "x".repeat(120_000) }),
    );

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  describe("technology tags", () => {
    it("reuses an existing tag whatever its spelling, without a second row", async () => {
      const tag = unique("shared");
      await createSubmission(author.id, { technologies: [tag] });

      const res = await post(
        author.authorization,
        validBody({ technologies: [tag.toUpperCase()] }),
      );

      expect(res.status).toBe(201);
      expect(await prisma.technology.count({ where: { name: tag } })).toBe(1);
      expect(
        await prisma.submission.count({
          where: { technologies: { some: { name: tag } } },
        }),
      ).toBe(2);
    });

    it("creates a new tag once when two requests add it at the same moment", async () => {
      const tag = unique("race");

      const [first, second] = await Promise.all([
        post(
          author.authorization,
          validBody({ title: "First racer", technologies: [tag] }),
        ),
        post(
          author.authorization,
          validBody({ title: "Second racer", technologies: [tag] }),
        ),
      ]);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(await prisma.technology.count({ where: { name: tag } })).toBe(1);
    });

    it("rolls the new tag back when the submission itself cannot be created", async () => {
      const tag = unique("rolledback");
      const label = unique("Orphan");

      await expect(
        submissionRepository.createWithCriteria({
          // No such user, so the foreign key rejects the submission after
          // the tag has already been created inside the transaction.
          authorId: 2_147_483_647,
          title: "Never created",
          description: "This insert fails on the author foreign key.",
          githubUrl: "https://github.com/o/r",
          githubOwner: "o",
          githubRepo: "r",
          criteria: [label],
          technologies: [tag],
        }),
      ).rejects.toThrow();

      expect(await prisma.technology.count({ where: { name: tag } })).toBe(0);
      expect(await prisma.criterion.count({ where: { label } })).toBe(0);
    });
  });
});
