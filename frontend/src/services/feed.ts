import type { components } from "@/types/api.gen";
import { publicRequest } from "./apiClient";

type FeedResponse = components["schemas"]["FeedResponse"];
export type FeedItem = components["schemas"]["FeedItem"];
export type PageMeta = components["schemas"]["PaginationMeta"];

export interface FeedParams {
  page: number;
  limit: number;
  search?: string;
  technologies?: string[];
}

export async function getPublicFeed(
  params: FeedParams,
  signal?: AbortSignal,
): Promise<{ items: FeedItem[]; meta: PageMeta }> {
  const response = await publicRequest<FeedResponse>("/feed", {
    query: {
      page: params.page,
      limit: params.limit,
      // The API rejects an empty search or technologies value, so an empty
      // one is left out instead of sent.
      search: params.search || undefined,
      technologies: params.technologies?.length
        ? params.technologies.join(",")
        : undefined,
    },
    signal,
  });

  return { items: response.data, meta: response.meta };
}
