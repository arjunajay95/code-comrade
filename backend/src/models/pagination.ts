import { z } from "zod";

export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 50;

// Keeps (page - 1) * limit well inside the database's integer range, so an
// absurd page number is a clean 400 instead of a database error.
export const PAGE_MAX = 100_000;

// Query strings arrive as text, so both values are coerced to numbers.
// A limit above the maximum is rejected, never clamped, so the client
// learns its request was wrong (PROJECT_BLUEPRINT §10, D-16).
export const paginationQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(PAGE_MAX).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGE_LIMIT_MAX)
      .default(PAGE_LIMIT_DEFAULT),
  })
  .strict();

export type Pagination = z.infer<typeof paginationQuery>;

export const toSkip = ({ page, limit }: Pagination): number =>
  (page - 1) * limit;

// totalItems must come from a database count, never from the length of the
// page of results, which only ever holds one page.
export const buildMeta = (totalItems: number, { page, limit }: Pagination) => ({
  totalItems,
  currentPage: page,
  totalPages: Math.ceil(totalItems / limit),
  itemsPerPage: limit,
});
