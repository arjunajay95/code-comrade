import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";

const app = createApp();

describe("integration harness", () => {
  it("reaches the test database", async () => {
    const res = await request(app).get("/api/v1/health/ready");
    expect(res.status).toBe(200);
  });

  // Asks PostgreSQL which database this connection is using. Unlike checking
  // for an empty table, this stays true however much data other test files
  // create.
  it("runs against the test database, not the development one", async () => {
    const [row] = await prisma.$queryRaw<{ current_database: string }[]>`
      SELECT current_database()
    `;
    expect(row?.current_database).toBe("codecomrade_test");
  });

  it("rejects a protected route without a session", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
