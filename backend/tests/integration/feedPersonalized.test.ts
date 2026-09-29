import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { feedService } from "../../src/service/feed.service.js";
import { createSubmission, createUser, unique } from "./fixtures.js";

const app = createApp();
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);
const page = { page: 1, limit: 50 };

// A user whose stack is exactly one unique tag, plus two submissions: one
// older that matches the stack, one newer that does not. Unique tags keep
// other test files' submissions from ever matching.
const setup = async () => {
  const tag = unique("tag");
  const otherTag = unique("tag");
  const author = await createUser();
  const matching = await createSubmission(author.id, {
    technologies: [tag],
    createdAt: hoursAgo(10),
  });
  const unmatched = await createSubmission(author.id, {
    technologies: [otherTag],
    createdAt: hoursAgo(1),
  });
  return { tag, matching, unmatched };
};

const withStack = async (tags: string[]) => {
  const user = await createUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { technologies: { connect: tags.map((name) => ({ name })) } },
  });
  return user;
};

const indexOf = (data: { id: number }[], id: number) =>
  data.findIndex((item) => item.id === id);

describe("personalized feed ranking", () => {
  it("ranks a matching submission above a newer one that does not match", async () => {
    const { tag, matching, unmatched } = await setup();
    const user = await withStack([tag]);

    const { data } = await feedService.listPersonalized(user.id, page, false);

    // 0.7 x 1 + 0.3 x recency(10h) is about 0.97, and nothing else in the
    // database shares this unique tag, so it ranks first.
    expect(indexOf(data, matching.id)).toBe(0);
    expect(indexOf(data, unmatched.id)).toBeGreaterThan(0);
    expect(data[0]?.matchedTechnologies).toEqual([tag]);
  });

  it("falls back to recency order for a user with no technologies", async () => {
    const { matching, unmatched } = await setup();
    const user = await createUser();

    const { data } = await feedService.listPersonalized(user.id, page, false);

    // With no stack, every tag score is 0, so the newer submission wins.
    expect(indexOf(data, unmatched.id)).toBeLessThan(
      indexOf(data, matching.id),
    );
  });

  it("includes the score breakdown only when allowed", async () => {
    const { tag } = await setup();
    const user = await withStack([tag]);

    const hidden = await feedService.listPersonalized(user.id, page, false);
    const shown = await feedService.listPersonalized(user.id, page, true);

    expect(hidden.data[0]).not.toHaveProperty("_score");
    expect(shown.data[0]?._score?.tag).toBe(1);
    expect(shown.data[0]?._score?.final).toBeCloseTo(
      0.7 + 0.3 * Math.exp((-Math.LN2 / 72) * 10),
      2,
    );
  });
});

describe("GET /feed/personalized", () => {
  it("rejects a caller without a session", async () => {
    const res = await request(app).get("/api/v1/feed/personalized");
    expect(res.status).toBe(401);
  });
});
