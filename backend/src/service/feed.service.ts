import type { FeedQuery } from "../models/feed.schemas.js";
import { buildMeta, toSkip } from "../models/pagination.js";
import { submissionRepository } from "../repository/submission.repository.js";
import { FEED_WINDOW } from "../config/constants.js";
import type { PersonalizedFeedQuery } from "../models/feed.schemas.js";
import { userRepository } from "../repository/user.repository.js";
import {
  ageInHours,
  byScoreThenRecency,
  finalScore,
  recencyScore,
  tagScore,
} from "../utils/feedScoring.js";

type FeedRow = Awaited<
  ReturnType<typeof submissionRepository.listFeed>
>["items"][number];

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

// A feed item, built field by field. The personalized feed extends this with
// matchedTechnologies in the next step.
export const toFeedItem = (row: FeedRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  githubUrl: row.githubUrl,
  createdAt: row.createdAt,
  // D-14: derived on every read.
  status: row._count.reviews === 0 ? "PENDING" : "REVIEWED",
  author: { username: row.author.username, karma: row.author.karma },
  technologies: row.technologies,
  reviewCount: row._count.reviews,
});

export const feedService = {
  async listPublic(query: FeedQuery) {
    const { items, total } = await submissionRepository.listFeed(
      { search: query.search, technologies: query.technologies },
      toSkip(query),
      query.limit,
    );
    return { data: items.map(toFeedItem), meta: buildMeta(total, query) };
  },

  // PROJECT_BLUEPRINT §6: score the newest FEED_WINDOW submissions against
  // the user's stack, sort, then page over the sorted array. The window is
  // bounded, so paging in memory is exact and cheap.
  async listPersonalized(
    userId: number,
    query: PersonalizedFeedQuery,
    includeScore: boolean,
  ) {
    const [techIds, window] = await Promise.all([
      userRepository.findTechnologyIds(userId),
      submissionRepository.listRecentWindow(FEED_WINDOW, userId),
    ]);

    const stack = new Set(techIds);
    // One "now" for the whole request, so every submission's recency is
    // measured from the same instant.
    const now = new Date();

    const ranked = window
      .map((row) => {
        const tag = tagScore(
          stack,
          row.technologies.map((t) => t.id),
        );
        const recency = recencyScore(ageInHours(row.createdAt, now));
        return {
          row,
          id: row.id,
          createdAt: row.createdAt,
          tag,
          recency,
          score: finalScore(tag, recency),
        };
      })
      .sort(byScoreThenRecency);

    const start = toSkip(query);

    return {
      data: ranked
        .slice(start, start + query.limit)
        .map(({ row, tag, recency, score }) => ({
          ...toFeedItem(row),
          // The tags the user shares with this submission, so the interface
          // can show why it ranked where it did.
          matchedTechnologies: row.technologies
            .filter((t) => stack.has(t.id))
            .map((t) => t.name),
          ...(includeScore && {
            _score: {
              final: round4(score),
              tag: round4(tag),
              recency: round4(recency),
            },
          }),
        })),
      // The total is the window size, not every submission ever posted.
      meta: buildMeta(ranked.length, query),
    };
  },
};
