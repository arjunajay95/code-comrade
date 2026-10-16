import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// The write limiter is lifted for the rest of the suite (RATE_LIMIT_WRITE_TEST
// in setup.ts), because the fixtures would trip it, and the app is built with
// no proxy in front of it. This file needs the opposite: the real limit of 5
// writes a minute, and one trusted proxy, the way production sits behind
// Render's. Both settings are read once, when the app is imported, so they are
// set here before the imports below run. Each test file gets its own copy of
// the app and its limiter, so the other files never see these settings.
vi.hoisted(() => {
  process.env.RATE_LIMIT_WRITE_TEST = "false";
  process.env.TRUST_PROXY_HOPS = "1";
});

import { createApp } from "../../src/app.js";
import { actAs } from "./auth.js";

const app = createApp();

const WRITES_PER_MINUTE = 5;

// One write through the write limiter, as seen from a given client address.
// PATCH /users/me is the cheapest write that needs nothing set up.
const writeAs = (authorization: string, forwardedFor: string) =>
  request(app)
    .patch("/api/v1/users/me")
    .set("Authorization", authorization)
    .set("X-Forwarded-For", forwardedFor)
    .send({ bio: "A short bio." });

// Sends up to the limit from one address and returns the statuses seen.
const spendBudget = async (
  authorization: string,
  forwardedFor: (attempt: number) => string,
): Promise<number[]> => {
  const statuses: number[] = [];
  for (let attempt = 0; attempt < WRITES_PER_MINUTE; attempt++) {
    statuses.push((await writeAs(authorization, forwardedFor(attempt))).status);
  }
  return statuses;
};

describe("the write limiter and proxy trust (D-19, T-14)", () => {
  it("is running with one trusted proxy and the real limit of five", () => {
    // If this fails, the settings above did not take effect and the tests
    // below are not testing what they say.
    expect(app.get("trust proxy")).toBe(1);
  });

  it("D-10 row 12: a sixth write in a minute from one client is 429 RATE_LIMITED", async () => {
    const user = await actAs("a");
    const client = "203.0.113.10";

    const allowed = await spendBudget(user.authorization, () => client);
    const refused = await writeAs(user.authorization, client);

    expect(allowed).toEqual(Array<number>(WRITES_PER_MINUTE).fill(200));
    expect(refused.status).toBe(429);
    expect(refused.body).toMatchObject({
      success: false,
      error: { code: "RATE_LIMITED" },
    });
    // The 429 is an ordinary envelope, like every other error.
    expect(refused.body.error.requestId).toBe(refused.headers["x-request-id"]);
    expect(refused.headers["cache-control"]).toBe("no-store");
  });

  it("T-14: distinct client addresses get distinct buckets", async () => {
    const user = await actAs("b");
    const first = "198.51.100.1";
    const second = "198.51.100.2";

    await spendBudget(user.authorization, () => first);
    const firstRefused = await writeAs(user.authorization, first);
    // The first client is out of budget. The second has never written.
    const secondAllowed = await spendBudget(user.authorization, () => second);
    const secondRefused = await writeAs(user.authorization, second);

    expect(firstRefused.status).toBe(429);
    expect(secondAllowed).toEqual(Array<number>(WRITES_PER_MINUTE).fill(200));
    expect(secondRefused.status).toBe(429);
  });

  it("T-14: a forged forwarding header does not create a new bucket", async () => {
    const user = await actAs("c");
    // With one trusted proxy, the address the proxy itself saw is the last
    // entry, and it is the only one that counts. Whatever a client puts before
    // it is the client's own claim. Here the real client is always the same,
    // and each request forges a different address in front of it.
    const real = "192.0.2.7";
    const forged = (attempt: number) => `1.1.1.${attempt + 1}, ${real}`;

    const allowed = await spendBudget(user.authorization, forged);
    const sixth = await writeAs(user.authorization, `1.1.1.99, ${real}`);

    expect(allowed).toEqual(Array<number>(WRITES_PER_MINUTE).fill(200));
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("RATE_LIMITED");
  });
});
