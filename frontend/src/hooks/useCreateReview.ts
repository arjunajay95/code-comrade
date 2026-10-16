"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import { createReview, type CreateReviewInput } from "@/services/submissions";
import type { Me } from "@/services/users";
import { useIdempotencyKey } from "./useIdempotencyKey";

export function useCreateReview(submissionId: number) {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const idempotency = useIdempotencyKey();

  return useMutation({
    mutationFn: (input: CreateReviewInput) =>
      createReview(getToken, submissionId, input, idempotency.keyFor(input)),
    onSuccess: (created) => {
      idempotency.reset();
      // The karma badge updates from the response, with no refetch. The
      // server already paid it, so this only mirrors the new total.
      queryClient.setQueryData<Me>(
        queryKeys.me(userId ?? "signed-out"),
        (me) =>
          me && {
            ...me,
            karma: created.reviewerKarma,
            stats: { ...me.stats, reviewsGiven: me.stats.reviewsGiven + 1 },
          },
      );
      // Returned, so the mutation stays pending until the detail page has
      // refreshed. The form then swaps to its "already reviewed" state without
      // a moment where it looks submittable again.
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.submissions.detail(submissionId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all }),
        // The author's received list and stats, and the reviewer's own list.
        queryClient.invalidateQueries({ queryKey: queryKeys.users.mineAll }),
        queryClient.invalidateQueries({ queryKey: ["users", "profile"] }),
      ]);
    },
    onError: (error) => {
      // 409 means this user already reviewed it, for example in another tab.
      // The page is stale, so refresh it and let it show the posted review.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.submissions.detail(submissionId),
        });
      }
    },
  });
}
