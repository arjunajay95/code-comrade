"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { updateMe } from "@/services/users";

export function useUpdateStack() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (technologies: string[]) =>
      updateMe(getToken, { technologies }),
    onSuccess: (me) => {
      // The response is the updated profile, so the cache is set directly
      // instead of fetching it again.
      queryClient.setQueryData(queryKeys.me(userId ?? "signed-out"), me);
      // The ranking depends on the stack, so every cached personalized page is
      // now stale. Saving may also have created new technology names.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.feed.personalizedAll,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.technologies.all,
      });
    },
  });
}
