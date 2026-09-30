import type { components } from "@/types/api.gen";
import { authedRequest, type GetToken } from "./apiClient";

type MeResponse = components["schemas"]["MeResponse"];
export type Me = MeResponse["data"];

export async function getMe(getToken: GetToken): Promise<Me> {
  const response = await authedRequest<MeResponse>(getToken, "/users/me");
  return response.data;
}
