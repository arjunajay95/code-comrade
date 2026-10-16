import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { registeredRoutes } from "../../src/routes/registry.js";
import { actAs, type Actor } from "./auth.js";
import { createSubmission } from "./fixtures.js";

const app = createApp();

// INV-4: nothing on the platform is ever deleted, so no DELETE route exists.
// Not a 403 and not a 405: the route is simply undefined, and the 404 handler
// answers it like any other path nobody defined.

// Fills Express's path parameters with plausible values, so each registered
// path becomes a concrete URL a client could try.
const concrete = (path: string): string =>
  path.replace(/:username/g, "someone").replace(/:\w+/g, "1");

const everyPath = [...new Set(registeredRoutes.map((r) => concrete(r.path)))];

describe("no DELETE route exists (INV-4)", () => {
  let owner: Actor;

  beforeAll(async () => {
    owner = await actAs("a");
  });

  it("registers no route with the DELETE method", () => {
    expect(registeredRoutes.filter((r) => r.method === "delete")).toEqual([]);
  });

  it("has paths to check, so the loop below cannot pass by being empty", () => {
    expect(everyPath.length).toBeGreaterThan(10);
  });

  it.each(everyPath)(
    "answers DELETE %s with the 404 envelope",
    async (path) => {
      const res = await request(app).delete(`/api/v1${path}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.headers.allow).toBeUndefined();
    },
  );

  it("answers the author's own DELETE with 404 too, and the submission survives", async () => {
    const submission = await createSubmission(owner.id);

    const res = await request(app)
      .delete(`/api/v1/submissions/${submission.id}`)
      .set("Authorization", owner.authorization);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(
      await prisma.submission.count({ where: { id: submission.id } }),
    ).toBe(1);
  });
});
