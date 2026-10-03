import { describe, expect, it } from "vitest";
import { parseGithubUrl } from "../../src/utils/githubUrl.js";

// The bypass list from THREAT_MODEL T-11. Every entry must be rejected.
const T11_BYPASS_ATTEMPTS: [string, string][] = [
  ["http://github.com/o/r", "wrong scheme"],
  ["https://github.com.evil.example/o/r", "suffix host"],
  ["https://evil.example/github.com/o/r", "host in path"],
  ["https://user@github.com/o/r", "userinfo section"],
  ["https://github.com./o/r", "trailing dot"],
  ["https://GitHub.com/o/r", "uppercase host"],
  ["https://localhost/o/r", "loopback"],
  ["http://169.254.169.254/", "metadata address"],
  ["https://github.com/../../etc/passwd", "traversal segments"],
  ["https://github.com/o", "missing repo segment"],
  ["https://github.com/o/r/extra", "excess segments"],
  ["https://github.com//r", "empty segment"],
];

// Further inputs the strict pattern rejects. Not in T-11, but each one is a
// way a lenient parser would let something through.
const MORE_REJECTIONS: [string, string][] = [
  ["", "empty string"],
  ["HTTPS://github.com/o/r", "uppercase scheme"],
  ["//github.com/o/r", "scheme-relative"],
  ["git@github.com:o/r.git", "ssh form"],
  ["https://github.com:443/o/r", "explicit port"],
  ["https://github.com/o/r/", "trailing slash"],
  ["https://github.com/o/r?tab=readme", "query string"],
  ["https://github.com/o/r#readme", "fragment"],
  ["https://github.com/o\\r", "backslash"],
  ["https://github.com/%2e%2e/r", "percent-encoded traversal"],
  ["https://github.com/o/r\n", "trailing newline"],
  [" https://github.com/o/r", "leading space"],
  ["https://github.com/o/r x", "space in the path"],
  ["https://g\u0131thub.com/o/r", "lookalike host (dotless i)"],
  ["https://github.com/./r", "dot as owner"],
  ["https://github.com/o/.", "dot as repo"],
  ["https://github.com/o/..", "dot-dot as repo"],
];

describe("parseGithubUrl rejects", () => {
  it.each(T11_BYPASS_ATTEMPTS)("%s (%s)", (input) => {
    expect(parseGithubUrl(input)).toBeNull();
  });

  it.each(MORE_REJECTIONS)("%j (%s)", (input) => {
    expect(parseGithubUrl(input)).toBeNull();
  });
});

describe("parseGithubUrl accepts", () => {
  it.each([
    [
      "https://github.com/alice-frontend/dashboard-ui",
      "alice-frontend",
      "dashboard-ui",
    ],
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["https://github.com/github/.github", "github", ".github"],
    ["https://github.com/some_user/some_repo", "some_user", "some_repo"],
    ["https://github.com/Mixed/CaseRepo", "Mixed", "CaseRepo"],
  ])("%s", (input, owner, repo) => {
    expect(parseGithubUrl(input)).toEqual({ owner, repo, url: input });
  });

  // V-Q7: the stored URL must equal the URL rebuilt from the stored parts.
  it("returns a URL rebuilt from the parsed parts", () => {
    const parsed = parseGithubUrl("https://github.com/o/r");
    expect(parsed?.url).toBe(
      `https://github.com/${parsed?.owner}/${parsed?.repo}`,
    );
  });
});
