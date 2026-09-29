import { z } from "zod";
import { paginationQuery } from "./pagination.js";
import { requestSchema } from "./requestSchema.js";
import { TECHNOLOGY_NAME_MAX_LENGTH } from "./user.schemas.js";

export const FEED_FILTER_MAX_TECHNOLOGIES = 10;
export const FEED_SEARCH_MAX_LENGTH = 100;

// "react, TypeScript,react" becomes ["react", "typescript"]: split on commas,
// then trimmed, lowercased and de-duplicated like every technology name
// (D-17). An empty value is rejected rather than read as "no filter", since a
// client sending technologies= almost certainly has a bug.
const technologiesFilter = z
  .string()
  .trim()
  .min(1)
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    ),
  ])
  .pipe(
    z
      .array(z.string().max(TECHNOLOGY_NAME_MAX_LENGTH))
      .min(1)
      .max(FEED_FILTER_MAX_TECHNOLOGIES),
  );

// Pagination plus the two optional filters, in one strict object, so any
// other query parameter is still rejected (D-11).
const feedQuery = z
  .object({
    ...paginationQuery.shape,
    search: z.string().trim().min(1).max(FEED_SEARCH_MAX_LENGTH).optional(),
    technologies: technologiesFilter.optional(),
  })
  .strict();

// Pagination and the optional debug flag. No search or technology filters:
// the spec defines those for the public feed only.
const personalizedFeedQuery = z
  .object({
    ...paginationQuery.shape,
    debug: z.literal("1").optional(),
  })
  .strict();

export const personalizedFeedSchema = requestSchema({
  query: personalizedFeedQuery,
});

export type PersonalizedFeedQuery = z.infer<typeof personalizedFeedQuery>;

export const publicFeedSchema = requestSchema({ query: feedQuery });

export type FeedQuery = z.infer<typeof feedQuery>;
