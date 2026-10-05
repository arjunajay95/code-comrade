import { describe, expect, it } from "vitest";
import {
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  RATINGS_MAX_COUNT,
  createReviewSchema,
} from "../../src/models/review.schemas.js";

const validBody = () => ({
  feedback: "Clear structure, but the error handling needs another pass.",
  ratings: [
    { criterionId: 11, rating: 4 },
    { criterionId: 12, rating: 5 },
  ],
});

// Parses the way the validate middleware does: body, query and params.
const parse = (body: unknown, params: unknown = { id: "7" }) =>
  createReviewSchema.safeParse({ body, query: {}, params });

const failures = (body: unknown, params?: unknown) => {
  const result = parse(body, params);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      }));
};

describe("createReviewSchema accepts", () => {
  it("a complete body and a numeric id", () => {
    const result = parse(validBody());

    expect(result.success).toBe(true);
    expect(result.data?.params.id).toBe(7);
  });

  it("feedback of exactly the minimum and maximum length", () => {
    for (const length of [FEEDBACK_MIN_LENGTH, FEEDBACK_MAX_LENGTH]) {
      const feedback = "f".repeat(length);
      expect(parse({ ...validBody(), feedback }).success).toBe(true);
    }
  });

  it("every rating from 1 to 5, and as many as five entries", () => {
    const ratings = [1, 2, 3, 4, 5].map((rating) => ({
      criterionId: rating * 10,
      rating,
    }));
    expect(ratings).toHaveLength(RATINGS_MAX_COUNT);
    expect(parse({ ...validBody(), ratings }).success).toBe(true);
  });

  it("trims the feedback", () => {
    const result = parse({
      ...validBody(),
      feedback: `   ${"f".repeat(FEEDBACK_MIN_LENGTH)}  \n`,
    });

    expect(result.data?.body.feedback).toBe("f".repeat(FEEDBACK_MIN_LENGTH));
  });
});

describe("createReviewSchema rejects", () => {
  it.each(["feedback", "ratings"])("a body with no %s", (field) => {
    const body = Object.fromEntries(
      Object.entries(validBody()).filter(([key]) => key !== field),
    );
    expect(failures(body).map((f) => f.path)).toContain(`body.${field}`);
  });

  it.each<[string, Record<string, unknown>, string]>([
    [
      "feedback one short of the minimum",
      { feedback: "f".repeat(FEEDBACK_MIN_LENGTH - 1) },
      "body.feedback",
    ],
    [
      "feedback that only reaches the minimum with padding",
      { feedback: `  ${"f".repeat(FEEDBACK_MIN_LENGTH - 1)}  ` },
      "body.feedback",
    ],
    ["feedback of only spaces", { feedback: " ".repeat(40) }, "body.feedback"],
    [
      "feedback one over the maximum",
      { feedback: "f".repeat(FEEDBACK_MAX_LENGTH + 1) },
      "body.feedback",
    ],
    ["feedback that is not a string", { feedback: 12345 }, "body.feedback"],
    ["no ratings at all", { ratings: [] }, "body.ratings"],
    [
      "more ratings than a submission can have criteria",
      {
        ratings: Array.from({ length: RATINGS_MAX_COUNT + 1 }, (_, i) => ({
          criterionId: i + 1,
          rating: 3,
        })),
      },
      "body.ratings",
    ],
    [
      "the same criterion rated twice",
      {
        ratings: [
          { criterionId: 11, rating: 4 },
          { criterionId: 11, rating: 2 },
        ],
      },
      "body.ratings",
    ],
    ["ratings that are not an array", { ratings: { 11: 4 } }, "body.ratings"],
    [
      "a rating of 0",
      { ratings: [{ criterionId: 11, rating: 0 }] },
      "body.ratings.0.rating",
    ],
    [
      "a rating of 6",
      { ratings: [{ criterionId: 11, rating: 6 }] },
      "body.ratings.0.rating",
    ],
    [
      "a fractional rating",
      { ratings: [{ criterionId: 11, rating: 3.5 }] },
      "body.ratings.0.rating",
    ],
    [
      "a rating sent as a string",
      { ratings: [{ criterionId: 11, rating: "4" }] },
      "body.ratings.0.rating",
    ],
    [
      "a null rating",
      { ratings: [{ criterionId: 11, rating: null }] },
      "body.ratings.0.rating",
    ],
    [
      "a criterion id of 0",
      { ratings: [{ criterionId: 0, rating: 3 }] },
      "body.ratings.0.criterionId",
    ],
    [
      "a negative criterion id",
      { ratings: [{ criterionId: -4, rating: 3 }] },
      "body.ratings.0.criterionId",
    ],
    [
      "a fractional criterion id",
      { ratings: [{ criterionId: 1.5, rating: 3 }] },
      "body.ratings.0.criterionId",
    ],
    [
      "a criterion id sent as a string",
      { ratings: [{ criterionId: "11", rating: 3 }] },
      "body.ratings.0.criterionId",
    ],
    [
      "a criterion id beyond the database's integer range",
      { ratings: [{ criterionId: 2_147_483_648, rating: 3 }] },
      "body.ratings.0.criterionId",
    ],
    [
      "a rating entry with an extra field",
      { ratings: [{ criterionId: 11, rating: 3, comment: "x" }] },
      "body.ratings.0",
    ],
  ])("%s", (_name, overrides, path) => {
    expect(
      failures({ ...validBody(), ...overrides }).map((f) => f.path),
    ).toContain(path);
  });

  // The mass assignment control: who the reviewer is, which submission this
  // is for and how much karma it earns are never the client's to say.
  it.each(["reviewerId", "submissionId", "karma", "id", "createdAt"])(
    "%s, which the client never supplies",
    (field) => {
      const found = failures({ ...validBody(), [field]: 1 });

      expect(found.map((f) => f.path)).toContain("body");
      expect(found.some((f) => f.message.includes(field))).toBe(true);
    },
  );

  it("anything that is not an object", () => {
    expect(failures("a string").map((f) => f.path)).toContain("body");
    expect(failures(null).map((f) => f.path)).toContain("body");
  });
});

describe("createReviewSchema checks the id in the path", () => {
  it.each(["abc", "0", "-1", "1.5", "2147483648", ""])("rejects %j", (id) => {
    expect(failures(validBody(), { id }).map((f) => f.path)).toContain(
      "params.id",
    );
  });

  it("rejects a missing id and an extra path parameter", () => {
    expect(parse(validBody(), {}).success).toBe(false);
    expect(parse(validBody(), { id: "1", other: "x" }).success).toBe(false);
  });
});
