export type DiffLineKind = "context" | "removed" | "added";

export interface DiffLine {
  number: number;
  kind: DiffLineKind;
  code: string;
}

// The decorative review card in the landing hero (PROJECT_BLUEPRINT §13). It is
// an illustration, so none of this comes from the API.
export const HERO_REVIEW = {
  path: "src/middleware/rateLimit.ts",
  lines: [
    {
      number: 14,
      kind: "context",
      code: "const windowStart = now - (now % WINDOW_MS)",
    },
    { number: 15, kind: "removed", code: "const key = `rl:${ip}`" },
    {
      number: 15,
      kind: "added",
      code: "const key = `rl:${ip}:${windowStart}`",
    },
    {
      number: 16,
      kind: "context",
      code: "const hits = await redis.incr(key)",
    },
  ] satisfies DiffLine[],
  comment: {
    author: "leo_codes",
    text: "Put the window start in the key, so bursts at the window edge stop sharing a bucket.",
  },
  rating: { label: "Correctness", value: 4 },
} as const;
