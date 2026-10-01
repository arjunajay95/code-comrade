"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getMe } from "@/services/users";

// The signed-in user's own profile, cached by TanStack Query. It only runs
// once Clerk confirms a session, so signed-out visitors never send it.
export function useMe() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.me(userId ?? "signed-out"),
    queryFn: () => getMe(getToken),
    enabled: isSignedIn === true,
  });
}
