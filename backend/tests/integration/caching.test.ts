import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("caching headers", () => {
  it("lets the public feed be stored but revalidated on every request", async () => {
    const res = await request(app).get("/api/v1/feed");
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(res.headers.etag).toBeDefined();
  });

  // Phase 5 done-when: a conditional request on the public feed returns 304.
  // Test files run one at a time, so nothing changes the feed between the
  // two requests.
  it("answers a conditional request for an unchanged feed with 304", async () => {
    const first = await request(app).get("/api/v1/feed");
    const second = await request(app)
      .get("/api/v1/feed")
      .set("If-None-Match", first.headers.etag as string);

    expect(second.status).toBe(304);
    expect(second.text).toBe("");
  });

  it("lets the technology list be reused for five minutes", async () => {
    const res = await request(app).get("/api/v1/technologies");
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
  });

  it("stores nothing by default", async () => {
    const res = await request(app).get("/api/v1/health/live");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("never caches an error, even on a cacheable route", async () => {
    const res = await request(app).get("/api/v1/technologies?limit=51");
    expect(res.status).toBe(400);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("never caches a response to an unauthenticated personal request", async () => {
    const res = await request(app).get("/api/v1/feed/personalized");
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});
