import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  FEED_RECENCY_WEIGHT,
  FEED_TAG_WEIGHT,
  FEED_WINDOW,
} from "../../src/config/constants.js";
import { prisma } from "../../src/config/prisma.js";
import { feedService } from "../../src/service/feed.service.js";
import { createSubmission, createUser, unique } from "./fixtures.js";

const app = createApp();

// The feed ranks the newest FEED_WINDOW submissions in the whole database,
// and every other test file adds submissions to that same database. A
// submission dated hours ago is not "a little older" than they are, it is
// outside the window altogether once enough newer ones exist, and the suite
// passed that point long ago. So everything these tests create is dated a
// moment ago, in a known order, which keeps it among the newest however much
// other files have added, and every call asks for the whole window, so no
// test depends on which page someone else's rows pushed it onto.
const justNow = (millisecondsAgo: number) =>
  new Date(Date.now() - millisecondsAgo);
const page = { page: 1, limit: FEED_WINDOW };

// A user whose stack is exactly one unique tag, plus two submissions: an older
// one that carries that tag and one other, so the user knows half of its tags,
// and a newer one that does not match at all. The unique tags keep other test
// files' submissions from ever matching.
const setup = async () => {
  const tag = unique("tag");
  const unknownTag = unique("tag");
  const otherTag = unique("tag");
  const author = await createUser();
  const matching = await createSubmission(author.id, {
    technologies: [tag, unknownTag],
    createdAt: justNow(20),
  });
  const unmatched = await createSubmission(author.id, {
    technologies: [otherTag],
    createdAt: justNow(10),
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

    // Half the tag weight plus almost all of the recency weight, about 0.65,
    // against at most 0.3 for anything else, and nothing else shares this
    // unique tag. The newer submission has to be on the page for the
    // comparison to mean anything, which is what the second check proves.
    // Only the shared tag is reported as matched, not the submission's other.
    expect(indexOf(data, matching.id)).toBe(0);
    expect(indexOf(data, unmatched.id)).toBeGreaterThan(0);
    expect(data[0]?.matchedTechnologies).toEqual([tag]);
  });

  it("falls back to recency order for a user with no technologies", async () => {
    const { matching, unmatched } = await setup();
    const user = await createUser();

    const { data } = await feedService.listPersonalized(user.id, page, false);

    // With no stack, every tag score is 0, so the newer submission wins. Both
    // must be found first: a missing one is -1, which sorts below everything.
    const newer = indexOf(data, unmatched.id);
    const older = indexOf(data, matching.id);
    expect(newer).toBeGreaterThanOrEqual(0);
    expect(older).toBeGreaterThanOrEqual(0);
    expect(newer).toBeLessThan(older);
  });

  it("includes the score breakdown only when allowed", async () => {
    const { tag } = await setup();
    const user = await withStack([tag]);

    const hidden = await feedService.listPersonalized(user.id, page, false);
    const shown = await feedService.listPersonalized(user.id, page, true);

    expect(hidden.data[0]).not.toHaveProperty("_score");
    // The user knows one of the submission's two tags, so the tag score is
    // 0.5. It is moments old, so recency is still almost exactly 1. The final
    // score is the weighted blend of the two. The exact decay and the weights
    // are pinned, to ten decimal places, by the unit tests in
    // feedScoring.test.ts. What this checks is that the breakdown is wired
    // through to the response and that the parts add up.
    expect(shown.data[0]?._score?.tag).toBe(0.5);
    expect(shown.data[0]?._score?.recency).toBeCloseTo(1, 3);
    expect(shown.data[0]?._score?.final).toBeCloseTo(
      FEED_TAG_WEIGHT * 0.5 + FEED_RECENCY_WEIGHT * 1,
      3,
    );
  });

  it("leaves out the user's own submissions, but not other users' view of them", async () => {
    const tag = unique("tag");
    const user = await createUser();
    const own = await createSubmission(user.id, { technologies: [tag] });
    // The user's stack matches their own submission perfectly, which is
    // exactly the case that would otherwise put it at the top of their feed.
    await prisma.user.update({
      where: { id: user.id },
      data: { technologies: { connect: [{ name: tag }] } },
    });
    const other = await withStack([tag]);

    const mine = await feedService.listPersonalized(user.id, page, false);
    const theirs = await feedService.listPersonalized(other.id, page, false);

    expect(indexOf(mine.data, own.id)).toBe(-1);
    expect(indexOf(theirs.data, own.id)).toBe(0);
  });
});

describe("GET /feed/personalized", () => {
  it("rejects a caller without a session", async () => {
    const res = await request(app).get("/api/v1/feed/personalized");
    expect(res.status).toBe(401);
  });
});
