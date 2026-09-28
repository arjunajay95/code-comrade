export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

// The rule every username must satisfy, derived or user-edited. Shared with
// the PATCH /users/me schema so the two can never disagree.
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

// "me" would collide with the GET /users/me route, which is matched first,
// making that user's public profile unreachable. The rest stop anyone from
// posing as the platform itself.
export const RESERVED_USERNAMES = new Set([
  "me",
  "admin",
  "api",
  "root",
  "support",
  "system",
]);

const FALLBACK_BASE = "user";

// Only the fields derivation is allowed to use. Email is deliberately
// absent: usernames are public, and deriving one from an email address
// would publish part of it without the user's consent.
export interface UsernameSource {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

// Lowercases, strips accents ("José" becomes "jose"), turns every run of
// disallowed characters into a single underscore, and trims underscores
// from both ends.
export const normalizeUsername = (raw: string): string =>
  raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const isUsable = (candidate: string): boolean =>
  USERNAME_PATTERN.test(candidate) && !RESERVED_USERNAMES.has(candidate);

// Tries the Clerk username, then first and last name, and falls back to
// "user". Each candidate is normalized and cut to the maximum length before
// it is checked.
export const deriveBaseUsername = (source: UsernameSource): string => {
  const fullName = [source.firstName, source.lastName]
    .filter(Boolean)
    .join(" ");
  const candidates = [source.username, fullName];

  for (const raw of candidates) {
    if (!raw) continue;
    const candidate = normalizeUsername(raw).slice(0, USERNAME_MAX_LENGTH);
    if (isUsable(candidate)) return candidate;
  }

  return FALLBACK_BASE;
};

// Appends a numeric suffix, shortening the base first if needed so the
// result never exceeds the maximum length.
export const withSuffix = (base: string, suffix: number): string => {
  const suffixText = String(suffix);
  return base.slice(0, USERNAME_MAX_LENGTH - suffixText.length) + suffixText;
};
