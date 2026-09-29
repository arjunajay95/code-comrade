import type { FeedQuery } from "../models/feed.schemas.js";
import { buildMeta, toSkip } from "../models/pagination.js";
import { submissionRepository } from "../repository/submission.repository.js";

type FeedRow = Awaited<
  ReturnType<typeof submissionRepository.listFeed>
>["items"][number];

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
};
