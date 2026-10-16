"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  listMyReviews,
  listMySubmissions,
  listReviewsReceived,
  type ListParams,
} from "@/services/users";

// The three /users/me lists. Each is tied to the signed-in user, so the key
// carries the Clerk user id like every other private query (D-22).
function useMyList<T>(
  list: "submissions" | "reviews" | "reviews-received",
  params: ListParams,
  fetchPage: (
    getToken: ReturnType<typeof useAuth>["getToken"],
    params: ListParams,
    signal: AbortSignal,
  ) => Promise<T>,
) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.mine(userId ?? "signed-out", list, params),
    queryFn: ({ signal }) => fetchPage(getToken, params, signal),
    enabled: isSignedIn === true,
    // Same rule as the personalized feed: keep the previous page on screen
    // only within the same user's data. Index 2 of the key is the user id.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === userId ? previousData : undefined,
  });
}

export const useMySubmissions = (params: ListParams) =>
  useMyList("submissions", params, listMySubmissions);

export const useMyReviews = (params: ListParams) =>
  useMyList("reviews", params, listMyReviews);

export const useReviewsReceived = (params: ListParams) =>
  useMyList("reviews-received", params, listReviewsReceived);
