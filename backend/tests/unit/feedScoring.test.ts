import { describe, expect, it } from "vitest";
import {
  ageInHours,
  byScoreThenRecency,
  finalScore,
  recencyScore,
  tagScore,
} from "../../src/utils/feedScoring.js";

// The expected values below come straight from PROJECT_BLUEPRINT §6, with
// the constants in config/constants.ts: weights 0.7 and 0.3, and a 72-hour
// half-life. If a constant changes, these tests should fail, because the
// feed's behavior changed.

describe("tagScore", () => {
  it("is 1 when every submission tag is in the user's stack", () => {
    expect(tagScore(new Set([1, 2, 3]), [1, 2])).toBe(1);
  });

  it("is the share of submission tags the user knows", () => {
    expect(tagScore(new Set([1]), [1, 2])).toBe(0.5);
  });

  it("is 0 when nothing overlaps", () => {
    expect(tagScore(new Set([5]), [1, 2])).toBe(0);
  });

  it("is 0 for a user with no technologies, with no special case", () => {
    expect(tagScore(new Set(), [1, 2])).toBe(0);
  });

  it("is 0 for a submission with no tags instead of dividing by zero", () => {
    expect(tagScore(new Set([1]), [])).toBe(0);
  });
});

describe("recencyScore", () => {
  it("is 1 for a brand new submission", () => {
    expect(recencyScore(0)).toBe(1);
  });

  it("halves at the 72-hour half-life", () => {
    expect(recencyScore(72)).toBeCloseTo(0.5, 10);
  });

  it("quarters at two half-lives", () => {
    expect(recencyScore(144)).toBeCloseTo(0.25, 10);
  });

  it("treats a future timestamp as brand new rather than scoring above 1", () => {
    expect(recencyScore(-5)).toBe(1);
  });
});

describe("finalScore", () => {
  it("scores a full match at 0h as 1.0", () => {
    expect(finalScore(1, recencyScore(0))).toBeCloseTo(1, 10);
  });

  it("scores a full match at 72h as 0.85", () => {
    expect(finalScore(1, recencyScore(72))).toBeCloseTo(0.85, 10);
  });

  it("scores no match at 0h as 0.3, the recency weight alone", () => {
    expect(finalScore(0, recencyScore(0))).toBeCloseTo(0.3, 10);
  });
});

describe("ageInHours", () => {
  it("measures whole and fractional hours between two dates", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(ageInHours(new Date("2026-10-01T00:00:00Z"), now)).toBe(12);
    expect(ageInHours(new Date("2026-10-01T11:30:00Z"), now)).toBe(0.5);
  });
});

describe("byScoreThenRecency", () => {
  const at = (iso: string) => new Date(iso);

  it("orders by score, highest first", () => {
    const items = [
      { id: 1, score: 0.4, createdAt: at("2026-10-01T00:00:00Z") },
      { id: 2, score: 0.9, createdAt: at("2026-10-01T00:00:00Z") },
    ];
    expect(items.sort(byScoreThenRecency).map((i) => i.id)).toEqual([2, 1]);
  });

  it("breaks a score tie by newest first, then by highest id", () => {
    const items = [
      { id: 1, score: 0.5, createdAt: at("2026-10-01T00:00:00Z") },
      { id: 3, score: 0.5, createdAt: at("2026-10-02T00:00:00Z") },
      { id: 2, score: 0.5, createdAt: at("2026-10-02T00:00:00Z") },
    ];
    expect(items.sort(byScoreThenRecency).map((i) => i.id)).toEqual([3, 2, 1]);
  });

  // PROJECT_BLUEPRINT §6: a user with no technologies degrades to pure
  // recency order. This scores a set of submissions the way the service
  // will, for an empty stack, and checks the result is newest first.
  it("gives a user with no technologies pure recency order", () => {
    const now = at("2026-10-10T00:00:00Z");
    const submissions = [
      { id: 1, techIds: [1], createdAt: at("2026-10-01T00:00:00Z") },
      { id: 2, techIds: [2], createdAt: at("2026-10-09T00:00:00Z") },
      { id: 3, techIds: [1, 2], createdAt: at("2026-10-05T00:00:00Z") },
    ];
    const noStack = new Set<number>();

    const ranked = submissions
      .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        score: finalScore(
          tagScore(noStack, s.techIds),
          recencyScore(ageInHours(s.createdAt, now)),
        ),
      }))
      .sort(byScoreThenRecency);

    expect(ranked.map((r) => r.id)).toEqual([2, 3, 1]);
  });
});
