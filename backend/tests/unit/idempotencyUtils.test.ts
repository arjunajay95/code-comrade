import { describe, expect, it } from "vitest";
import {
  IDEMPOTENCY_KEY_PATTERN,
  canonicalJson,
  endpointOf,
  hashRequest,
} from "../../src/utils/idempotency.js";

describe("IDEMPOTENCY_KEY_PATTERN", () => {
  it.each([
    "a",
    "A",
    "0",
    "-",
    "_",
    "3f1c2a9e-8b7d-4e6f-9a1b-2c3d4e5f6a7b",
    "key_with-everything_ABC-123",
    "x".repeat(128),
  ])("accepts %j", (key) => {
    expect(IDEMPOTENCY_KEY_PATTERN.test(key)).toBe(true);
  });

  it.each<[string, string]>([
    ["", "empty"],
    ["x".repeat(129), "one over the limit"],
    ["has space", "a space"],
    [" leading", "a leading space"],
    ["trailing ", "a trailing space"],
    ["line\nbreak", "a newline"],
    ["tab\there", "a tab"],
    ["bad!char", "punctuation"],
    ["dots.are.out", "dots"],
    ["slash/y", "a slash"],
    ["a,b", "a comma, which is how two headers arrive joined"],
    ["clé", "an accented letter"],
    ["日本語", "non-Latin letters"],
    ["emoji\u{1F600}", "an emoji"],
    ["key\u0000", "a null byte"],
  ])("rejects %j (%s)", (key) => {
    expect(IDEMPOTENCY_KEY_PATTERN.test(key)).toBe(false);
  });
});

describe("canonicalJson", () => {
  it("sorts object keys, so key order never matters", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: 2, b: 1 })).toBe(canonicalJson({ b: 1, a: 2 }));
  });

  it("sorts at every depth, inside arrays too", () => {
    expect(canonicalJson({ z: { y: 1, x: 2 }, list: [{ b: 1, a: 2 }] })).toBe(
      '{"list":[{"a":2,"b":1}],"z":{"x":2,"y":1}}',
    );
  });

  it("keeps the order of an array, because order is part of what a list says", () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    expect(
      canonicalJson({
        ratings: [
          { criterionId: 1, rating: 4 },
          { criterionId: 2, rating: 5 },
        ],
      }),
    ).not.toBe(
      canonicalJson({
        ratings: [
          { criterionId: 2, rating: 5 },
          { criterionId: 1, rating: 4 },
        ],
      }),
    );
  });

  it("writes no whitespace", () => {
    expect(canonicalJson({ a: [1, { b: "x y" }] })).toBe(
      '{"a":[1,{"b":"x y"}]}',
    );
  });

  it("tells a number from a string, and true from the string true", () => {
    expect(canonicalJson({ a: 1 })).not.toBe(canonicalJson({ a: "1" }));
    expect(canonicalJson({ a: true })).not.toBe(canonicalJson({ a: "true" }));
    expect(canonicalJson({ a: null })).not.toBe(canonicalJson({ a: "null" }));
  });

  it("escapes strings exactly as JSON does", () => {
    expect(canonicalJson({ a: 'say "hi"\n' })).toBe('{"a":"say \\"hi\\"\\n"}');
    expect(canonicalJson({ 'k"ey': 1 })).toBe('{"k\\"ey":1}');
  });

  it("writes a missing body and an explicit null the same way", () => {
    expect(canonicalJson(undefined)).toBe("null");
    expect(canonicalJson(null)).toBe("null");
  });

  it("leaves out an undefined member, as JSON does", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("handles scalars at the top level", () => {
    expect(canonicalJson("text")).toBe('"text"');
    expect(canonicalJson(12.5)).toBe("12.5");
    expect(canonicalJson(false)).toBe("false");
    expect(canonicalJson([])).toBe("[]");
    expect(canonicalJson({})).toBe("{}");
  });
});

describe("hashRequest", () => {
  // The format is frozen once keys exist: a changed hash would make every
  // in-flight retry look like a different request. These values were worked
  // out separately from the implementation, so a change here is a decision,
  // not an accident.
  it.each<[string, string, unknown, string]>([
    [
      "POST",
      "/api/v1/submissions",
      { b: [true, null, "x"], a: 1 },
      "d5886b0d8698eb65d95d6a6b952e9698a64864e9d13fef50e15ea92d162fc7ac",
    ],
    [
      "POST",
      "/api/v1/submissions/7/reviews",
      { ratings: [{ rating: 4, criterionId: 3 }], feedback: "hello" },
      "1c5b8fdff125722b6df8d650d1b018a8ca221e1827ea5df82e36934e6ff6a5ca",
    ],
    [
      "POST",
      "/probe/x",
      undefined,
      "e73f6cc3b158b39d4a61114cd70a6ca8365154235d847438f021c69ade630b28",
    ],
  ])("hashes %s %s to the frozen value", (method, path, body, expected) => {
    expect(hashRequest(method, path, body)).toBe(expected);
  });

  it("gives a 64 character lowercase hex digest", () => {
    expect(hashRequest("POST", "/x", {})).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is the same whatever order the keys arrive in", () => {
    expect(hashRequest("POST", "/x", { a: 1, b: 2 })).toBe(
      hashRequest("POST", "/x", { b: 2, a: 1 }),
    );
  });

  it("changes with the body, the method and the path", () => {
    const base = hashRequest("POST", "/x/1", { a: 1 });

    expect(hashRequest("POST", "/x/1", { a: 2 })).not.toBe(base);
    expect(hashRequest("PUT", "/x/1", { a: 1 })).not.toBe(base);
    expect(hashRequest("POST", "/x/2", { a: 1 })).not.toBe(base);
  });

  it("cannot be fooled by moving a character between the path and the body", () => {
    expect(hashRequest("POST", "/x", "1")).not.toBe(
      hashRequest("POST", "/x1", ""),
    );
    expect(hashRequest("POST", "/a\nb", null)).not.toBe(
      hashRequest("POST", "/a", "b"),
    );
  });
});

describe("endpointOf", () => {
  const req = (overrides: {
    method?: string;
    baseUrl?: string;
    path?: string;
    route?: { path?: unknown };
  }) => ({
    method: "POST",
    baseUrl: "/api/v1/submissions",
    path: "/7/reviews",
    ...overrides,
  });

  it("is the method plus the full route pattern, parameters left in", () => {
    expect(endpointOf(req({ route: { path: "/:id/reviews" } }))).toBe(
      "POST /api/v1/submissions/:id/reviews",
    );
  });

  it("drops the trailing slash of a collection route", () => {
    expect(endpointOf(req({ route: { path: "/" } }))).toBe(
      "POST /api/v1/submissions",
    );
  });

  it("is the same for two different ids, which is the point of a pattern", () => {
    const one = endpointOf(
      req({ path: "/1/reviews", route: { path: "/:id/reviews" } }),
    );
    const two = endpointOf(
      req({ path: "/2/reviews", route: { path: "/:id/reviews" } }),
    );
    expect(one).toBe(two);
  });

  it("works for a route mounted at the root", () => {
    expect(
      endpointOf(
        req({ baseUrl: "", path: "/probe/1", route: { path: "/probe/:id" } }),
      ),
    ).toBe("POST /probe/:id");
    expect(
      endpointOf(req({ baseUrl: "", path: "/", route: { path: "/" } })),
    ).toBe("POST /");
  });

  it("falls back to the real path when no route matched", () => {
    expect(endpointOf(req({ path: "/7/reviews" }))).toBe(
      "POST /api/v1/submissions/7/reviews",
    );
    expect(endpointOf(req({ route: { path: 42 } }))).toBe(
      "POST /api/v1/submissions/7/reviews",
    );
  });
});
