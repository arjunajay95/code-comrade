import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { unique } from "./fixtures.js";

const app = createApp();

describe("GET /technologies search", () => {
  it("matches a substring of the name, ignoring case", async () => {
    // A unique stem keeps other test files' technologies out of the result.
    const stem = unique("stem");
    await prisma.technology.createMany({
      data: [
        { name: `${stem}alpha` },
        { name: `${stem}beta` },
        { name: unique("other") },
      ],
    });

    const res = await request(app).get(
      `/api/v1/technologies?search=${stem.toUpperCase()}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.map((t: { name: string }) => t.name)).toEqual([
      `${stem}alpha`,
      `${stem}beta`,
    ]);
    expect(res.body.meta.totalItems).toBe(2);
  });

  it("rejects an empty or overlong search", async () => {
    for (const search of ["", "a".repeat(41)]) {
      const res = await request(app).get(
        `/api/v1/technologies?search=${search}`,
      );
      expect(res.status, `search="${search}"`).toBe(400);
    }
  });
});
