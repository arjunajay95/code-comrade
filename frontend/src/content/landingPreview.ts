import type { FeedRowItem } from "@/components/feed/FeedItemRow";

const HOUR = 60 * 60 * 1000;

// Static example requests for the landing page preview. The times are worked
// out from now each time the page renders, so they always read as recent.
export function createPreviewItems(now: number = Date.now()): FeedRowItem[] {
  const ago = (hours: number) => new Date(now - hours * HOUR).toISOString();

  return [
    {
      id: 1,
      title: "Rate limiter middleware for Express",
      description:
        "Sliding window limiter backed by Redis. I am not sure the key expiry handles bursts at the window edge.",
      githubUrl: "https://github.com/example/express-rate-limiter",
      createdAt: ago(2),
      status: "PENDING",
      reviewCount: 0,
      author: { username: "mira_dev", karma: 14 },
      technologies: [
        { id: 1, name: "express" },
        { id: 2, name: "typescript" },
        { id: 3, name: "redis" },
      ],
      matchedTechnologies: ["express", "typescript"],
    },
    {
      id: 2,
      title: "Optimistic updates hook for React lists",
      description:
        "Rolls back on failure and drops duplicate in-flight mutations. Is the rollback order right when two requests fail?",
      githubUrl: "https://github.com/example/optimistic-list",
      createdAt: ago(5),
      status: "REVIEWED",
      reviewCount: 1,
      author: { username: "leo_codes", karma: 22 },
      technologies: [
        { id: 4, name: "react" },
        { id: 2, name: "typescript" },
        { id: 5, name: "tanstack-query" },
      ],
      matchedTechnologies: ["react", "typescript"],
    },
    {
      id: 3,
      title: "Worker pool with graceful shutdown in Go",
      description:
        "Drains queued jobs on SIGTERM with a deadline. Looking for race conditions in the close path.",
      githubUrl: "https://github.com/example/go-worker-pool",
      createdAt: ago(24),
      status: "REVIEWED",
      reviewCount: 3,
      author: { username: "sana_k", karma: 9 },
      technologies: [
        { id: 6, name: "go" },
        { id: 7, name: "docker" },
      ],
      matchedTechnologies: [],
    },
  ];
}
