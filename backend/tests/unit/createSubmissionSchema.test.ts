import { describe, expect, it } from "vitest";
import {
  CRITERIA_MAX_COUNT,
  CRITERION_LABEL_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  GITHUB_URL_MAX_LENGTH,
  SUBMISSION_TECHNOLOGIES_MAX_COUNT,
  TITLE_MAX_LENGTH,
  createSubmissionSchema,
} from "../../src/models/submission.schemas.js";

const validBody = () => ({
  title: "Dashboard UI kit",
  description: "A small component library, looking for feedback on structure.",
  githubUrl: "https://github.com/alice-frontend/dashboard-ui",
  criteria: [{ label: "Readability" }, { label: "Structure" }],
  technologies: ["react", "typescript"],
});

// Parses the way the validate middleware does: the body together with an
// empty query and empty params.
const parse = (body: unknown) =>
  createSubmissionSchema.safeParse({ body, query: {}, params: {} });

// The paths of every failing field, in the same dotted form validate puts in
// its error message.
const failingPaths = (body: unknown): string[] => {
  const result = parse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.map(String).join("."));
};

const distinctTechnologies = (count: number) =>
  Array.from({ length: count }, (_, i) => `tag${i}`);

describe("createSubmissionSchema accepts", () => {
  it("a complete, valid body", () => {
    expect(parse(validBody()).success).toBe(true);
  });

  it("the largest allowed values", () => {
    const urlPrefix = "https://github.com/o/";
    const body = {
      title: "t".repeat(TITLE_MAX_LENGTH),
      description: "d".repeat(DESCRIPTION_MAX_LENGTH),
      githubUrl:
        urlPrefix + "r".repeat(GITHUB_URL_MAX_LENGTH - urlPrefix.length),
      criteria: Array.from({ length: CRITERIA_MAX_COUNT }, (_, i) => ({
        label: `${"c".repeat(CRITERION_LABEL_MAX_LENGTH - 1)}${i}`,
      })),
      technologies: distinctTechnologies(SUBMISSION_TECHNOLOGIES_MAX_COUNT),
    };
    expect(parse(body).success).toBe(true);
  });
});

describe("createSubmissionSchema normalizes", () => {
  it("trims every text field, the URL included", () => {
    const result = parse({
      title: "  Padded title  ",
      description: "  A description with padding around it.  ",
      githubUrl: " https://github.com/o/r\n",
      criteria: [{ label: "  Readability  " }],
      technologies: ["react"],
    });

    expect(result.success).toBe(true);
    expect(result.data?.body).toMatchObject({
      title: "Padded title",
      description: "A description with padding around it.",
      githubUrl: "https://github.com/o/r",
      criteria: [{ label: "Readability" }],
    });
  });

  it("lowercases and de-duplicates technologies", () => {
    const result = parse({
      ...validBody(),
      technologies: ["React", " react ", "TypeScript", "REACT"],
    });

    expect(result.data?.body.technologies).toEqual(["react", "typescript"]);
  });

  it("counts technologies after de-duplication", () => {
    // Nine spellings of one tag is one tag, which is within the limit.
    const spellings = Array.from({ length: 9 }, (_, i) =>
      i % 2 === 0 ? "React" : " react ",
    );
    expect(parse({ ...validBody(), technologies: spellings }).success).toBe(
      true,
    );
  });
});

describe("createSubmissionSchema rejects", () => {
  it.each(["title", "description", "githubUrl", "criteria", "technologies"])(
    "a body with no %s",
    (field) => {
      const body = Object.fromEntries(
        Object.entries(validBody()).filter(([key]) => key !== field),
      );
      expect(failingPaths(body)).toContain(`body.${field}`);
    },
  );

  it.each<[string, Record<string, unknown>, string]>([
    ["a title that is too short", { title: "ab" }, "body.title"],
    ["a title of only spaces", { title: "   " }, "body.title"],
    [
      "a title that is too long",
      { title: "x".repeat(TITLE_MAX_LENGTH + 1) },
      "body.title",
    ],
    ["a title that is not a string", { title: 42 }, "body.title"],
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
    ["an empty criteria list", { criteria: [] }, "body.criteria"],
    [
      "too many criteria",
      {
        criteria: Array.from({ length: CRITERIA_MAX_COUNT + 1 }, (_, i) => ({
          label: `Criterion ${i}`,
        })),
      },
      "body.criteria",
    ],
    [
      "a criterion label that is too short",
      { criteria: [{ label: "a" }] },
      "body.criteria.0.label",
    ],
    [
      "a criterion label that is too long",
      { criteria: [{ label: "x".repeat(CRITERION_LABEL_MAX_LENGTH + 1) }] },
      "body.criteria.0.label",
    ],
    [
      "criterion labels that differ only in case and spacing",
      { criteria: [{ label: "Readability" }, { label: " readability " }] },
      "body.criteria",
    ],
    [
      "criteria given as plain strings",
      { criteria: ["Readability"] },
      "body.criteria.0",
    ],
    [
      "a criterion with an extra field",
      { criteria: [{ label: "Readability", weight: 3 }] },
      "body.criteria.0",
    ],
    ["an empty technology list", { technologies: [] }, "body.technologies"],
    [
      "too many distinct technologies",
      {
        technologies: distinctTechnologies(
          SUBMISSION_TECHNOLOGIES_MAX_COUNT + 1,
        ),
      },
      "body.technologies",
    ],
    [
      "a technology name that is too long",
      { technologies: ["x".repeat(41)] },
      "body.technologies.0",
    ],
    [
      "a technology name of only spaces",
      { technologies: ["   "] },
      "body.technologies.0",
    ],
    // The mass assignment control: the author and karma are never accepted.
    ["an authorId field", { authorId: 1 }, "body"],
    ["a karma field", { karma: 100 }, "body"],
  ])("%s", (_name, overrides, path) => {
    expect(failingPaths({ ...validBody(), ...overrides })).toContain(path);
  });

  it("anything that is not an object", () => {
    expect(failingPaths("a string")).toContain("body");
    expect(failingPaths(null)).toContain("body");
  });
});
