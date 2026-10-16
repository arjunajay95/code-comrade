import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { submissionRepository } from "../../src/repository/submission.repository.js";
import { actAs, type Actor } from "./auth.js";
import {
  createReview,
  createSubmission,
  createUser,
  unique,
} from "./fixtures.js";

const app = createApp();

// A valid id that no row has, so the schema accepts it and the lookup misses.
const NO_SUCH_ID = 2_000_000_000;

// A complete edit body. PUT replaces the four editable fields, so every test
// starts from all four and changes only what it is about. The technology is
// unique per call, so two tests never share a tag by accident.
const validEdit = (overrides: Record<string, unknown> = {}) => ({
  title: "Edited title",
  description: "An edited description that is long enough to pass.",
  githubUrl: "https://github.com/edited-owner/edited-repo",
  technologies: [unique("edit")],
  ...overrides,
});

const put = (
  authorization: string | undefined,
  id: number | string,
  body: unknown,
  headers: Record<string, string> = {},
) => {
  const req = request(app).put(`/api/v1/submissions/${id}`).set(headers);
  if (authorization) req.set("Authorization", authorization);
  return req.send(body as object);
};

// Everything an edit could touch, read straight from the database, so a test
// can prove that a rejected request changed nothing at all.
const stored = (id: number) =>
  prisma.submission.findUniqueOrThrow({
    where: { id },
    include: {
      technologies: { orderBy: { name: "asc" } },
      criteria: { orderBy: { id: "asc" } },
      repoSnapshot: true,
    },
  });

describe("PUT /submissions/:id", () => {
  let owner: Actor;
  let outsider: Actor;

  beforeAll(async () => {
    owner = await actAs("a");
    outsider = await actAs("b");
  });

  describe("who may edit", () => {
    it("rejects a request with no session", async () => {
      const submission = await createSubmission(owner.id);
      const before = await stored(submission.id);

      const res = await put(undefined, submission.id, validEdit());

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(await stored(submission.id)).toEqual(before);
    });

    it("rejects someone who is not the author with 403 and changes nothing", async () => {
      const submission = await createSubmission(owner.id);
      const before = await stored(submission.id);

      const res = await put(outsider.authorization, submission.id, validEdit());

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(await stored(submission.id)).toEqual(before);
    });

    it("answers 404 for a submission that does not exist, to the author and to anyone else", async () => {
      const asOwner = await put(owner.authorization, NO_SUCH_ID, validEdit());
      const asOutsider = await put(
        outsider.authorization,
        NO_SUCH_ID,
        validEdit(),
      );

      // The 404 never depends on who is asking, so the API cannot be used to
      // find out which ids exist (AUTHORIZATION_MATRIX section 3).
      expect(asOwner.status).toBe(404);
      expect(asOwner.body.error.code).toBe("NOT_FOUND");
      expect(asOutsider.status).toBe(404);
      expect(asOutsider.body.error.code).toBe("NOT_FOUND");
    });

    it("checks ownership before the URL, so a non-author learns nothing from the URL check", async () => {
      const submission = await createSubmission(owner.id);

      const res = await put(
        outsider.authorization,
        submission.id,
        validEdit({ githubUrl: "http://evil.example/x" }),
      );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("an edit by the author", () => {
    it("replaces the four fields, swaps the technologies and leaves the criteria alone", async () => {
      const oldTag = unique("old");
      const newTag = unique("new");
      const submission = await createSubmission(owner.id, {
        title: "Original title",
        criteria: ["Readability", "Structure"],
        technologies: [oldTag],
      });
      const before = await stored(submission.id);

      const res = await put(
        owner.authorization,
        submission.id,
        validEdit({
          title: "  New title  ",
          technologies: [newTag.toUpperCase()],
        }),
      );
      const data = res.body.data;

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        id: submission.id,
        title: "New title",
        description: "An edited description that is long enough to pass.",
        githubUrl: "https://github.com/edited-owner/edited-repo",
        author: { username: owner.username },
      });
      expect(data.technologies.map((t: { name: string }) => t.name)).toEqual([
        newTag,
      ]);
      // Same criteria, same ids: ratings point at them (INV-4).
      expect(
        data.criteria.map((c: { id: number; label: string }) => [
          c.id,
          c.label,
        ]),
      ).toEqual(before.criteria.map((c) => [c.id, c.label]));
      expect(new Date(data.updatedAt).getTime()).toBeGreaterThan(
        before.updatedAt.getTime(),
      );
      // D-08: no Clerk identifier anywhere in the body.
      expect(JSON.stringify(res.body)).not.toMatch(/clerk/i);

      // The old tag is no longer on this submission, and still exists.
      expect(
        await prisma.submission.count({
          where: {
            id: submission.id,
            technologies: { some: { name: oldTag } },
          },
        }),
      ).toBe(0);
      expect(await prisma.technology.count({ where: { name: oldTag } })).toBe(
        1,
      );
    });

    it("returns exactly what GET /submissions/:id returns afterwards", async () => {
      const submission = await createSubmission(owner.id);

      const res = await put(owner.authorization, submission.id, validEdit());
      const detail = await request(app).get(
        `/api/v1/submissions/${submission.id}`,
      );

      expect(detail.body.data).toEqual(res.body.data);
    });

    it("keeps the owner and repository columns in step with the URL (V-Q7)", async () => {
      const submission = await createSubmission(owner.id);

      await put(owner.authorization, submission.id, validEdit());
      const row = await stored(submission.id);

      expect(row.githubOwner).toBe("edited-owner");
      expect(row.githubRepo).toBe("edited-repo");
      expect(row.githubUrl).toBe(
        `https://github.com/${row.githubOwner}/${row.githubRepo}`,
      );
    });

    it("leaves existing reviews and their ratings exactly as they were", async () => {
      const submission = await createSubmission(owner.id, {
        criteria: ["Readability", "Structure"],
      });
      const reviewer = await createUser();
      await createReview(submission, reviewer.id, [4, 5]);
      const ratings = () =>
        prisma.criterionRating.findMany({
          where: { review: { submissionId: submission.id } },
          orderBy: { id: "asc" },
        });
      const before = await ratings();

      const res = await put(owner.authorization, submission.id, validEdit());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REVIEWED");
      expect(res.body.data.reviewCount).toBe(1);
      expect(
        res.body.data.criteria.map(
          (c: { averageRating: number }) => c.averageRating,
        ),
      ).toEqual([4, 5]);
      expect(await ratings()).toEqual(before);
    });
  });

  describe("the cached repository snapshot", () => {
    it("is deleted when the URL changes", async () => {
      const submission = await createSubmission(owner.id);
      await prisma.repoSnapshot.create({
        data: { submissionId: submission.id, stars: 42 },
      });

      const res = await put(
        owner.authorization,
        submission.id,
        validEdit({ githubUrl: "https://github.com/moved-owner/moved-repo" }),
      );

      expect(res.status).toBe(200);
      expect(res.body.data.repository).toBeNull();
      expect(
        await prisma.repoSnapshot.count({
          where: { submissionId: submission.id },
        }),
      ).toBe(0);
    });

    it("is kept when the URL does not change", async () => {
      const submission = await createSubmission(owner.id);
      const snapshot = await prisma.repoSnapshot.create({
        data: { submissionId: submission.id, stars: 42 },
      });

      const res = await put(
        owner.authorization,
        submission.id,
        validEdit({ githubUrl: submission.githubUrl }),
      );

      expect(res.status).toBe(200);
      expect(res.body.data.repository).toMatchObject({ stars: 42 });
      const after = await prisma.repoSnapshot.findUniqueOrThrow({
        where: { submissionId: submission.id },
      });
      expect(after.fetchedAt).toEqual(snapshot.fetchedAt);
    });
  });

  describe("a rejected edit changes nothing", () => {
    it.each([
      ["http://github.com/o/r", "the wrong scheme"],
      ["https://github.com.evil.example/o/r", "a suffix host"],
      ["https://github.com/o/r.git", "a clone URL"],
      ["https://GitHub.com/o/r", "an uppercase host"],
      ["", "an empty string"],
    ])(
      "answers %j with INVALID_REPO_URL (%s) and keeps the snapshot",
      async (githubUrl) => {
        const submission = await createSubmission(owner.id);
        await prisma.repoSnapshot.create({
          data: { submissionId: submission.id, stars: 7 },
        });
        const before = await stored(submission.id);

        const res = await put(
          owner.authorization,
          submission.id,
          validEdit({ githubUrl }),
        );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_REPO_URL");
        expect(await stored(submission.id)).toEqual(before);
      },
    );

    // Criteria are not part of the edit surface at all, so sending them is
    // the same unknown-field rejection as any other field that is not listed.
    it.each<[string, Record<string, unknown>, string]>([
      [
        "criteria",
        { criteria: [{ label: "Sneaky new criterion" }] },
        "criteria",
      ],
      ["an authorId", { authorId: 999 }, "authorId"],
      ["a karma field", { karma: 100 }, "karma"],
    ])("rejects %s with VALIDATION_ERROR", async (_name, extra, mentioned) => {
      const submission = await createSubmission(owner.id);
      const before = await stored(submission.id);

      const res = await put(
        owner.authorization,
        submission.id,
        validEdit(extra),
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain(mentioned);
      expect(await stored(submission.id)).toEqual(before);
    });

    it("rejects a body with a field missing, since PUT replaces all four", async () => {
      const submission = await createSubmission(owner.id);
      const before = await stored(submission.id);

      const res = await put(
        owner.authorization,
        submission.id,
        validEdit({ description: undefined }),
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("body.description");
      expect(await stored(submission.id)).toEqual(before);
    });

    it.each(["abc", "0", "2147483648"])(
      "rejects the id %j in the path",
      async (id) => {
        const res = await put(owner.authorization, id, validEdit());

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
      },
    );

    it("rolls back every part of an edit when the submission cannot be updated", async () => {
      const tag = unique("rolledback");

      await expect(
        submissionRepository.updateOwn(2_147_483_647, {
          // No such submission, so the update fails after the new tag has
          // already been created inside the transaction.
          title: "Never applied",
          description: "This update fails on the missing submission.",
          githubUrl: "https://github.com/o/r",
          githubOwner: "o",
          githubRepo: "r",
          technologies: [tag],
          clearSnapshot: true,
        }),
      ).rejects.toThrow();

      expect(await prisma.technology.count({ where: { name: tag } })).toBe(0);
    });
  });

  describe("technology tags", () => {
    it("creates a new tag once when two edits add it at the same moment", async () => {
      const tag = unique("race");
      const first = await createSubmission(owner.id);
      const second = await createSubmission(owner.id);

      const [one, two] = await Promise.all([
        put(owner.authorization, first.id, validEdit({ technologies: [tag] })),
        put(owner.authorization, second.id, validEdit({ technologies: [tag] })),
      ]);

      expect(one.status).toBe(200);
      expect(two.status).toBe(200);
      expect(await prisma.technology.count({ where: { name: tag } })).toBe(1);
    });
  });

  // D-29 puts the idempotency middleware on the two POST routes only. These
  // stay true after that middleware exists, which is what they guard.
  describe("the Idempotency-Key header", () => {
    it("is ignored: the same key with a different body is not a replay", async () => {
      const submission = await createSubmission(owner.id);
      const headers = { "Idempotency-Key": "same-key-twice" };

      const first = await put(
        owner.authorization,
        submission.id,
        validEdit({ title: "First edit" }),
        headers,
      );
      const second = await put(
        owner.authorization,
        submission.id,
        validEdit({ title: "Second edit" }),
        headers,
      );

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.data.title).toBe("Second edit");
    });

    it("is not validated either, and no key is ever stored", async () => {
      const submission = await createSubmission(owner.id);

      const res = await put(owner.authorization, submission.id, validEdit(), {
        "Idempotency-Key": "not a valid key!!",
      });

      expect(res.status).toBe(200);
      expect(
        await prisma.idempotencyKey.count({ where: { userId: owner.id } }),
      ).toBe(0);
    });
  });
});
