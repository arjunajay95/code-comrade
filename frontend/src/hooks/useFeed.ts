"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPublicFeed, type FeedParams } from "@/services/feed";
import { queryKeys } from "@/services/queryKeys";

export function usePublicFeed(params: FeedParams) {
  return useQuery({
    queryKey: queryKeys.feed.public(params),
    // TanStack Query passes a signal that cancels the request if it is no
    // longer needed, for example when the user clicks to the next page again.
    queryFn: ({ signal }) => getPublicFeed(params, signal),
    // While the next page loads, keep showing the current one instead of
    // dropping back to a skeleton.
    placeholderData: keepPreviousData,
  });
}
