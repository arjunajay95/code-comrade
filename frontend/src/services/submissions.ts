import type { components } from "@/types/api.gen";
import { publicRequest } from "./apiClient";

type SubmissionDetailResponse =
  components["schemas"]["SubmissionDetailResponse"];
export type SubmissionDetail = SubmissionDetailResponse["data"];

export async function getSubmission(
  id: number,
  signal?: AbortSignal,
): Promise<SubmissionDetail> {
  const response = await publicRequest<SubmissionDetailResponse>(
    `/submissions/${id}`,
    { signal },
  );
  return response.data;
}
