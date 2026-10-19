// The decorative review request in the landing hero (PROJECT_BLUEPRINT §13). It
// is an illustration built from the app's own components, so none of this comes
// from the API. The time is worked out from now when the page renders.
const HOUR = 60 * 60 * 1000;

export function createHeroRequest(now: number = Date.now()) {
  return {
    title: "Rate limiter middleware for Express",
    author: { username: "mira_dev", karma: 14 },
    createdAt: new Date(now - 2 * HOUR).toISOString(),
    reviewCount: 1,
    technologies: [
      { id: 1, name: "express" },
      { id: 2, name: "typescript" },
      { id: 3, name: "redis" },
    ],
    description:
      "Sliding window limiter backed by Redis. Bursts at the window edge seem to slip through:\n```ts\nconst windowStart = now - (now % WINDOW_MS)\nconst key = `rl:${ip}`\nconst hits = await redis.incr(key)\n```",
    criteria: [
      { label: "Correctness", average: 4.0 },
      { label: "Readability", average: 4.5 },
    ],
    review: {
      reviewer: "leo_codes",
      karma: 22,
      feedback:
        "Put the window start in the key, as `rl:${ip}:${windowStart}`, so bursts at the edge stop sharing a bucket.",
      ratings: [
        { label: "Correctness", value: 4 },
        { label: "Readability", value: 5 },
      ],
    },
  };
}
