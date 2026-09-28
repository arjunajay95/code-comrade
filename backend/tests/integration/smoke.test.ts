import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("integration harness", () => {
  it("reaches the test database", async () => {
    const res = await request(app).get("/api/v1/health/ready");
    expect(res.status).toBe(200);
  });

  // The development database has 12 seeded technologies. The freshly reset
  // test database has none. An empty list proves the app is connected to
  // the test database, not the development one.
  it("runs against the freshly reset test database", async () => {
    const res = await request(app).get("/api/v1/technologies");
    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(0);
  });

  it("rejects a protected route without a session", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
