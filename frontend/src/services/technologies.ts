// frontend/src/services/technologies.ts

import type { components } from "@/types/api.gen";
import { publicRequest } from "./apiClient";
import type { PageMeta } from "./feed";

type TechnologyListResponse = components["schemas"]["TechnologyListResponse"];
export type Technology = components["schemas"]["Technology"];

export interface TechnologyParams {
  page: number;
  limit: number;
  search?: string;
}

export async function listTechnologies(
  params: TechnologyParams,
  signal?: AbortSignal,
): Promise<{ items: Technology[]; meta: PageMeta }> {
  const response = await publicRequest<TechnologyListResponse>(
    "/technologies",
    {
      query: {
        page: params.page,
        limit: params.limit,
        // The API rejects an empty search, so an empty one is left out.
        search: params.search || undefined,
      },
      signal,
    },
  );

  return { items: response.data, meta: response.meta };
}
