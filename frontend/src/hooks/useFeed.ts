// frontend/src/hooks/useFeed.ts
"use client";

import { useAuth } from "@clerk/nextjs";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getPersonalizedFeed,
  getPublicFeed,
  type FeedParams,
  type PersonalizedParams,
} from "@/services/feed";
import { queryKeys } from "@/services/queryKeys";

// enabled lets the page call both hooks and fetch only the one on screen.
export function usePublicFeed(params: FeedParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.feed.public(params),
    // TanStack Query passes a signal that cancels the request if it is no
    // longer needed, for example when the user changes a filter mid-request.
    queryFn: ({ signal }) => getPublicFeed(params, signal),
    enabled,
    // While the next page loads, keep showing the current one.
    placeholderData: keepPreviousData,
  });
}

export function usePersonalizedFeed(
  params: PersonalizedParams,
  enabled: boolean,
) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.feed.personalized(userId ?? "signed-out", params),
    queryFn: ({ signal }) => getPersonalizedFeed(getToken, params, signal),
    enabled: enabled && isSignedIn === true,
    // Like keepPreviousData, but only within the same user's data. Plain
    // keepPreviousData could show one user's ranked feed to the next person
    // who signs in on the same browser, until their own feed finished loading.
    // Index 2 of the key is the user id.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === userId ? previousData : undefined,
  });
}
