import type { components } from "@/types/api.gen";
import { authedRequest, type GetToken } from "./apiClient";

type MeResponse = components["schemas"]["MeResponse"];
type UpdateMeRequest = components["schemas"]["UpdateMeRequest"];
export type Me = MeResponse["data"];

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
