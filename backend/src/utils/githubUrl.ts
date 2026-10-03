// The only shape a repository URL may have (D-31, BLUEPRINT section 4a,
// THREAT_MODEL T-11). The check runs on the raw string with one strict
// pattern and deliberately avoids new URL(), which normalizes the very
// differences this control depends on: it lowercases hosts, reads backslashes
// as slashes, strips tabs and newlines, and drops default ports.
const PREFIX = "https://github.com/";
const REPO_URL = /^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  // Rebuilt from the two parts, never the input string, so it always equals
  // https://github.com/{githubOwner}/{githubRepo}, which V-Q7 audits.
  url: string;
}

const isDotSegment = (segment: string): boolean =>
  segment === "." || segment === "..";

// Returns null for anything that is not exactly https://github.com/{owner}/{repo}.
// The owner and repo are stored as separate columns and are what every
// outbound request is built from. The user's string is never a request target.
export const parseGithubUrl = (input: string): ParsedGithubUrl | null => {
  if (!REPO_URL.test(input)) return null;

  // The pattern guarantees exactly two segments after the prefix.
  const [owner, repo] = input.slice(PREFIX.length).split("/") as [
    string,
    string,
  ];
  if (isDotSegment(owner) || isDotSegment(repo)) return null;

  return { owner, repo, url: `${PREFIX}${owner}/${repo}` };
};
