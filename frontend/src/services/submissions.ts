import type { components } from "@/types/api.gen";
import { authedRequest, publicRequest, type GetToken } from "./apiClient";

type SubmissionDetailResponse =
  components["schemas"]["SubmissionDetailResponse"];
type CreateReviewResponse = components["schemas"]["CreateReviewResponse"];
export type SubmissionDetail = SubmissionDetailResponse["data"];
export type CreateSubmissionInput =
  components["schemas"]["CreateSubmissionRequest"];
export type UpdateSubmissionInput =
  components["schemas"]["UpdateSubmissionRequest"];
export type CreateReviewInput = components["schemas"]["CreateReviewRequest"];
export type CreatedReview = CreateReviewResponse["data"];

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

export async function createSubmission(
  getToken: GetToken,
  body: CreateSubmissionInput,
  idempotencyKey: string,
): Promise<SubmissionDetail> {
  const response = await authedRequest<SubmissionDetailResponse>(
    getToken,
    "/submissions",
    { method: "POST", body, idempotencyKey },
  );
  return response.data;
}

// PUT replaces the four editable fields. It takes no idempotency key: replaying
// the same body changes nothing (D-29).
export async function updateSubmission(
  getToken: GetToken,
  id: number,
  body: UpdateSubmissionInput,
): Promise<SubmissionDetail> {
  const response = await authedRequest<SubmissionDetailResponse>(
    getToken,
    `/submissions/${id}`,
    { method: "PUT", body },
  );
  return response.data;
}

export async function createReview(
  getToken: GetToken,
  submissionId: number,
  body: CreateReviewInput,
  idempotencyKey: string,
): Promise<CreatedReview> {
  const response = await authedRequest<CreateReviewResponse>(
    getToken,
    `/submissions/${submissionId}/reviews`,
    { method: "POST", body, idempotencyKey },
  );
  return response.data;
}
