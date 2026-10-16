"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getPublicProfile } from "@/services/users";

export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: ({ signal }) => getPublicProfile(username, signal),
  });
}
