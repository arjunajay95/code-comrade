import type { components } from "@/types/api.gen";
import { authedRequest, publicRequest, type GetToken } from "./apiClient";
import type { PageMeta } from "./feed";

type MeResponse = components["schemas"]["MeResponse"];
type UpdateMeRequest = components["schemas"]["UpdateMeRequest"];
type PublicProfileResponse = components["schemas"]["PublicProfileResponse"];
type SubmissionListResponse = components["schemas"]["SubmissionListResponse"];
type ReviewListResponse = components["schemas"]["ReviewListResponse"];
export type Me = MeResponse["data"];
export type PublicProfile = PublicProfileResponse["data"];
export type SubmissionSummary = components["schemas"]["SubmissionSummary"];
export type ReviewSummary = components["schemas"]["ReviewSummary"];

export interface ListParams {
  page: number;
  limit: number;
}

export async function getMe(getToken: GetToken): Promise<Me> {
  const response = await authedRequest<MeResponse>(getToken, "/users/me");
  return response.data;
}

export async function updateMe(
  getToken: GetToken,
  body: UpdateMeRequest,
): Promise<Me> {
  const response = await authedRequest<MeResponse>(getToken, "/users/me", {
    method: "PATCH",
    body,
  });
  return response.data;
}

export async function getPublicProfile(
  username: string,
  signal?: AbortSignal,
): Promise<PublicProfile> {
  const response = await publicRequest<PublicProfileResponse>(
    `/users/${encodeURIComponent(username)}`,
    { signal },
  );
  return response.data;
}

export async function listMySubmissions(
  getToken: GetToken,
  params: ListParams,
  signal?: AbortSignal,
): Promise<{ items: SubmissionSummary[]; meta: PageMeta }> {
  const response = await authedRequest<SubmissionListResponse>(
    getToken,
    "/users/me/submissions",
    { query: { ...params }, signal },
  );
  return { items: response.data, meta: response.meta };
}

export async function listMyReviews(
  getToken: GetToken,
  params: ListParams,
  signal?: AbortSignal,
): Promise<{ items: ReviewSummary[]; meta: PageMeta }> {
  const response = await authedRequest<ReviewListResponse>(
    getToken,
    "/users/me/reviews",
    { query: { ...params }, signal },
  );
  return { items: response.data, meta: response.meta };
}

export async function listReviewsReceived(
  getToken: GetToken,
  params: ListParams,
  signal?: AbortSignal,
): Promise<{ items: ReviewSummary[]; meta: PageMeta }> {
  const response = await authedRequest<ReviewListResponse>(
    getToken,
    "/users/me/reviews-received",
    { query: { ...params }, signal },
  );
  return { items: response.data, meta: response.meta };
}
