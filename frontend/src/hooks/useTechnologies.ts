// frontend/src/hooks/useTechnologies.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  listTechnologies,
  type TechnologyParams,
} from "@/services/technologies";

export function useTechnologies(params: TechnologyParams) {
  return useQuery({
    queryKey: queryKeys.technologies.list(params),
    queryFn: ({ signal }) => listTechnologies(params, signal),
    // The API sends this list with max-age=300, so five minutes matches.
    staleTime: 5 * 60_000,
  });
}
