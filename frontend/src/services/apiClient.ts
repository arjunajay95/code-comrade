// The only place the frontend calls the API. Components never call
// fetch directly. Public calls go through publicRequest, which never sends a
// token. Protected calls go through authedRequest, which requires Clerk's
// getToken, so a protected call cannot be made without it by accident.

import { API_URL } from "@/lib/config";

// Every error the API returns uses this envelope. The
// requestId is what a user quotes when reporting a problem, and it matches
// the server's log lines for that request.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Clerk's getToken: resolves to a fresh session token, or null when signed
// out. Clerk refreshes the short-lived token itself, so a stored copy would
// go stale within a minute.
export type GetToken = () => Promise<string | null>;

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

const buildUrl = (path: string, query?: Query): string => {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    // Optional filters are simply left out when not set.
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

async function request<T>(
  path: string,
  options: RequestOptions,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    // A cancelled request is not a failure. TanStack Query cancels requests
    // that are no longer needed, and expects the abort error back as is.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
      null,
    );
  }

  // The header is readable because the API exposes it through CORS.
  const headerRequestId = response.headers.get("X-Request-Id");
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok || !isSuccess(payload)) {
    const error = isErrorEnvelope(payload) ? payload.error : undefined;
    throw new ApiError(
      error?.message ?? "Something went wrong",
      response.status,
      error?.code ?? "INTERNAL",
      error?.requestId ?? headerRequestId,
    );
  }

  return payload as T;
}

const isSuccess = (payload: unknown): boolean =>
  typeof payload === "object" &&
  payload !== null &&
  "success" in payload &&
  payload.success === true;

const isErrorEnvelope = (
  payload: unknown,
): payload is { error: { code: string; message: string; requestId: string } } =>
  typeof payload === "object" && payload !== null && "error" in payload;

// For public routes. Never attaches a token, even when the user is signed in.
export function publicRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return request<T>(path, options);
}

// For protected routes. Asks Clerk for a fresh token on every call, and fails
// before sending anything if there is no session.
export async function authedRequest<T>(
  getToken: GetToken,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Sign in to continue", 401, "UNAUTHORIZED", null);
  }
  return request<T>(path, options, token);
}
