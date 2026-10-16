import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  GITHUB_URL_MAX_LENGTH,
  SUBMISSION_TECHNOLOGIES_MAX_COUNT,
  TITLE_MAX_LENGTH,
  updateSubmissionSchema,
} from "../../src/models/submission.schemas.js";

const validBody = () => ({
  title: "Dashboard UI kit",
  description: "A small component library, looking for feedback on structure.",
  githubUrl: "https://github.com/alice-frontend/dashboard-ui",
  technologies: ["react", "typescript"],
});

// Parses the way the validate middleware does: body, query and params.
const parse = (body: unknown, params: unknown = { id: "12" }) =>
  updateSubmissionSchema.safeParse({ body, query: {}, params });

const failures = (body: unknown, params?: unknown) => {
  const result = parse(body, params);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      }));
};

describe("updateSubmissionSchema accepts", () => {
  it("a complete body and a numeric id", () => {
    const result = parse(validBody());

    expect(result.success).toBe(true);
    expect(result.data?.params.id).toBe(12);
  });

  it("trims text and normalizes technologies the same way create does", () => {
    const result = parse({
      title: "  Padded title  ",
      description: "  A description with padding around it.  ",
      githubUrl: " https://github.com/o/r\n",
      technologies: ["React", " react ", "TypeScript"],
    });

    expect(result.data?.body).toEqual({
      title: "Padded title",
      description: "A description with padding around it.",
      githubUrl: "https://github.com/o/r",
      technologies: ["react", "typescript"],
    });
  });
});

describe("updateSubmissionSchema rejects", () => {
  // PUT replaces the four editable fields, so each one is required.
  it.each(["title", "description", "githubUrl", "technologies"])(
    "a body with no %s",
    (field) => {
      const body = Object.fromEntries(
        Object.entries(validBody()).filter(([key]) => key !== field),
      );
      expect(failures(body).map((f) => f.path)).toContain(`body.${field}`);
    },
  );

  // Criteria are locked once ratings point at them, so they are not part of
  // the edit surface at all. The refusal is the unknown-field rule.
  it("criteria, as an unknown field", () => {
    const found = failures({
      ...validBody(),
      criteria: [{ label: "Readability" }],
    });

    expect(found).toHaveLength(1);
    expect(found[0]?.path).toBe("body");
    expect(found[0]?.message).toContain("criteria");
  });

  it.each(["authorId", "id", "karma", "createdAt", "updatedAt", "githubOwner"])(
    "%s, which is never editable",
    (field) => {
      const found = failures({ ...validBody(), [field]: 1 });

      expect(found.map((f) => f.path)).toContain("body");
      expect(found.some((f) => f.message.includes(field))).toBe(true);
    },
  );

  // Create and edit share one definition of each field. A few limits are
  // enough here, since the create tests cover every one of them.
  it.each<[string, Record<string, unknown>, string]>([
    ["a title that is too short", { title: "ab" }, "body.title"],
    [
      "a title that is too long",
      { title: "x".repeat(TITLE_MAX_LENGTH + 1) },
      "body.title",
    ],
    [
      "a description that is too short",
      { description: "too short" },
      "body.description",
    ],
    [
      "a description that is too long",
      { description: "x".repeat(DESCRIPTION_MAX_LENGTH + 1) },
      "body.description",
    ],
    [
      "a URL that is too long",
      {
        githubUrl: `https://github.com/o/${"r".repeat(GITHUB_URL_MAX_LENGTH)}`,
      },
      "body.githubUrl",
    ],
    ["no technologies", { technologies: [] }, "body.technologies"],
    [
      "too many distinct technologies",
      {
        technologies: Array.from(
          { length: SUBMISSION_TECHNOLOGIES_MAX_COUNT + 1 },
          (_, i) => `tag${i}`,
        ),
      },
      "body.technologies",
    ],
  ])("%s", (_name, overrides, path) => {
    expect(
      failures({ ...validBody(), ...overrides }).map((f) => f.path),
    ).toContain(path);
  });
});

describe("updateSubmissionSchema checks the id in the path", () => {
  it.each(["abc", "0", "-1", "1.5", "2147483648", ""])("rejects %j", (id) => {
    expect(failures(validBody(), { id }).map((f) => f.path)).toContain(
      "params.id",
    );
  });

  it("accepts the largest id the database can hold", () => {
    expect(parse(validBody(), { id: "2147483647" }).success).toBe(true);
  });

  it("rejects a missing id and an extra path parameter", () => {
    expect(parse(validBody(), {}).success).toBe(false);
    expect(parse(validBody(), { id: "1", other: "x" }).success).toBe(false);
  });
});
