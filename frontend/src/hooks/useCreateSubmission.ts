"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  createSubmission,
  type CreateSubmissionInput,
} from "@/services/submissions";
import { useIdempotencyKey } from "./useIdempotencyKey";

export function useCreateSubmission() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const idempotency = useIdempotencyKey();

  return useMutation({
    mutationFn: (input: CreateSubmissionInput) =>
      createSubmission(getToken, input, idempotency.keyFor(input)),
    onSuccess: (submission) => {
      idempotency.reset();
      // The response is the full detail, so the detail page opens from the
      // cache with no second request.
      queryClient.setQueryData(
        queryKeys.submissions.detail(submission.id),
        submission,
      );
      // A new submission changes every feed page and the author's own lists
      // and stats.
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.mineAll });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me(userId ?? "signed-out"),
      });
    },
  });
}
