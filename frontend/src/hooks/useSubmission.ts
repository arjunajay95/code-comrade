"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getSubmission } from "@/services/submissions";

// A 404 is not retried: the shared retry rule in providers.tsx skips any 4xx,
// so a missing submission shows its message right away instead of after
// several repeated requests.
export function useSubmission(id: number) {
  return useQuery({
    queryKey: queryKeys.submissions.detail(id),
    queryFn: ({ signal }) => getSubmission(id, signal),
  });
}
