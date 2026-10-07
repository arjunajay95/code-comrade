import { createHash } from "node:crypto";
import type { Request } from "express";

// 1 to 128 characters from A-Z, a-z, 0-9, hyphen and underscore, so a
// client-generated UUID fits (PROJECT_BLUEPRINT section 9).
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

// JSON with every object's keys sorted and no whitespace, so two bodies that
// mean the same thing always produce the same string, whatever order the
// client wrote the keys in. Arrays keep their order, because the order of a
// list is part of what it says. A request body only ever comes from JSON, so
// only JSON values need handling.
export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    // undefined, a request with no body at all, has no JSON form. It is
    // written as null, the same as an explicit null body.
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const members = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${members.join(",")}}`;
};

// The hash stored with a key: SHA-256 of the method, the resolved path and
// the canonical body (PROJECT_BLUEPRINT section 9). The resolved path has the
// real ids in it, so the same key and body sent to a different submission is
// a different request. Only this hash is stored, never the body.
//
// The format is frozen once keys exist. Changing it would make every
// in-flight retry look like a different request, and a golden value in the
// unit tests guards that.
export const hashRequest = (
  method: string,
  path: string,
  body: unknown,
): string =>
  createHash("sha256")
    .update(`${method}\n${path}\n${canonicalJson(body)}`)
    .digest("hex");

// The method plus the route pattern, with the parameters left in:
// "POST /api/v1/submissions/:id/reviews". A key is scoped to this, so the same
// key on two different endpoints is two different keys. The pattern comes
// from the route that matched, so it cannot drift from the real routes.
export const endpointOf = (
  req: Pick<Request, "method" | "baseUrl" | "path"> & {
    route?: { path?: unknown };
  },
): string => {
  const pattern =
    typeof req.route?.path === "string" ? req.route.path : req.path;
  const full = `${req.baseUrl}${pattern}`.replace(/\/+$/, "") || "/";
  return `${req.method} ${full}`;
};
