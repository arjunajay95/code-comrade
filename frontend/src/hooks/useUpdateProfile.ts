"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { updateMe } from "@/services/users";

interface ProfileInput {
  username?: string;
  bio?: string | null;
}

export function useUpdateProfile() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProfileInput) => updateMe(getToken, input),
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.me(userId ?? "signed-out"), me);
      // A new username shows on every feed row, review and profile.
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.all,
      });
    },
  });
}
