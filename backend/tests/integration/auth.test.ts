import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { actAs, bearerFor, releaseSlot } from "./auth.js";

const app = createApp();

const me = (authorization?: string) => {
  const req = request(app).get("/api/v1/users/me");
  return authorization ? req.set("Authorization", authorization) : req;
};

describe("real Clerk sessions through requireAuth", () => {
  it("rejects a request with no token", async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a bearer value that is not a Clerk token", async () => {
    const res = await me("Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("resolves a real session token to the local user bound to that identity", async () => {
    const alice = await actAs("a");
    const res = await me(alice.authorization);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(alice.id);
    expect(res.body.data.username).toBe(alice.username);
  });

  it("gives each slot its own user", async () => {
    const author = await actAs("a");
    const reviewer = await actAs("b");

    const [asAuthor, asReviewer] = await Promise.all([
      me(author.authorization),
      me(reviewer.authorization),
    ]);

    expect(asAuthor.body.data.username).toBe(author.username);
    expect(asReviewer.body.data.username).toBe(reviewer.username);
    expect(author.username).not.toBe(reviewer.username);
  });

  it("creates the local user on the first request and reuses it on the second", async () => {
    await releaseSlot("d");
    const authorization = await bearerFor("d");

    const first = await me(authorization);
    expect(first.status).toBe(200);
    expect(first.body.data.username).toMatch(/^[a-z0-9_]{3,30}$/);

    const second = await me(authorization);
    expect(second.body.data.id).toBe(first.body.data.id);

    const rows = await prisma.user.count({
      where: { username: first.body.data.username },
    });
    expect(rows).toBe(1);
  });
});
