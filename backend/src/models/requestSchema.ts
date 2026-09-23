import { z } from "zod";

// Stands in for any part of the request a route does not expect. Because
// it is strict, a route with no query params still rejects "?foo=bar"
// instead of silently ignoring it.
const empty = z.object({}).strict();

// Builds the combined { body, query, params } schema.
// Any part a route leaves out defaults to the strict empty object above,
// so every route rejects unexpected input in all three places, not just
// in the parts it happens to define.
export const requestSchema = <
  B extends z.ZodType = typeof empty,
  Q extends z.ZodType = typeof empty,
  P extends z.ZodType = typeof empty,
>(parts: {
  body?: B;
  query?: Q;
  params?: P;
}) =>
  z
    .object({
      body: parts.body ?? empty,
      query: parts.query ?? empty,
      params: parts.params ?? empty,
    })
    .strict();
