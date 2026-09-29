import { describe, expect, it } from "vitest";
import {
  USERNAME_MAX_LENGTH,
  deriveBaseUsername,
  normalizeUsername,
  withSuffix,
} from "../../src/utils/deriveUsername.js";

const noName = { username: null, firstName: null, lastName: null };

describe("normalizeUsername", () => {
  it("strips accents and joins words with one underscore", () => {
    expect(normalizeUsername("José María")).toBe("jose_maria");
  });

  it("collapses runs of disallowed characters and trims underscores", () => {
    expect(normalizeUsername("  __Hello--World!!__ ")).toBe("hello_world");
  });
});

describe("deriveBaseUsername", () => {
  it("prefers the Clerk username", () => {
    expect(deriveBaseUsername({ ...noName, username: "Arjuna" })).toBe(
      "arjuna",
    );
  });

  it("falls back to first and last name", () => {
    expect(
      deriveBaseUsername({ ...noName, firstName: "Test", lastName: "Collide" }),
    ).toBe("test_collide");
  });

  it("skips a reserved name", () => {
    expect(deriveBaseUsername({ ...noName, username: "Admin" })).toBe("user");
  });

  it("skips a candidate too short to be valid", () => {
    expect(deriveBaseUsername({ ...noName, username: "ab" })).toBe("user");
  });

  it("falls back to user when nothing is usable", () => {
    expect(deriveBaseUsername(noName)).toBe("user");
  });

  it("cuts a long name to the maximum length", () => {
    const base = deriveBaseUsername({ ...noName, username: "a".repeat(50) });
    expect(base).toHaveLength(USERNAME_MAX_LENGTH);
  });
});

describe("withSuffix", () => {
  it("appends the suffix to a short base", () => {
    expect(withSuffix("test_collide", 4827)).toBe("test_collide4827");
  });

  it("shortens a full-length base so the result still fits", () => {
    const result = withSuffix("a".repeat(USERNAME_MAX_LENGTH), 4827);
    expect(result).toHaveLength(USERNAME_MAX_LENGTH);
    expect(result.endsWith("4827")).toBe(true);
  });
});
