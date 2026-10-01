import { z } from "zod";
import { paginationQuery } from "./pagination.js";
import { requestSchema } from "./requestSchema.js";
import { TECHNOLOGY_NAME_MAX_LENGTH } from "./user.schemas.js";

// Public and paginated like every other list (D-16). search is a substring
// of the tag name, for type-to-filter pickers. Names are stored lowercase
// (D-17), so lowercasing the term makes the match case-insensitive.
const listTechnologiesQuery = z
  .object({
    ...paginationQuery.shape,
    search: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(TECHNOLOGY_NAME_MAX_LENGTH)
      .optional(),
  })
  .strict();

export const listTechnologiesSchema = requestSchema({
  query: listTechnologiesQuery,
});

export type ListTechnologiesQuery = z.infer<typeof listTechnologiesQuery>;
