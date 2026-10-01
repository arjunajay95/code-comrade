import type { components } from "@/types/api.gen";
import { authedRequest, publicRequest, type GetToken } from "./apiClient";

type FeedResponse = components["schemas"]["FeedResponse"];
type PersonalizedFeedResponse =
  components["schemas"]["PersonalizedFeedResponse"];

export type FeedItem = components["schemas"]["FeedItem"];
export type PersonalizedFeedItem =
  components["schemas"]["PersonalizedFeedItem"];
export type PageMeta = components["schemas"]["PaginationMeta"];

export interface FeedParams {
  page: number;
  limit: number;
  search?: string;
  technologies?: string[];
}

export interface PersonalizedParams {
  page: number;
  limit: number;
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

export async function getPersonalizedFeed(
  getToken: GetToken,
  params: PersonalizedParams,
  signal?: AbortSignal,
): Promise<{ items: PersonalizedFeedItem[]; meta: PageMeta }> {
  const response = await authedRequest<PersonalizedFeedResponse>(
    getToken,
    "/feed/personalized",
    {
      query: { page: params.page, limit: params.limit },
      signal,
    },
  );

  return { items: response.data, meta: response.meta };
}
