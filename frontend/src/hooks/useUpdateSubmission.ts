"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  updateSubmission,
  type UpdateSubmissionInput,
} from "@/services/submissions";

export function useUpdateSubmission(id: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSubmissionInput) =>
      updateSubmission(getToken, id, input),
    onSuccess: (submission) => {
      queryClient.setQueryData(queryKeys.submissions.detail(id), submission);
      // Titles, descriptions and tags show in every feed and list.
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.mineAll });
    },
  });
}
