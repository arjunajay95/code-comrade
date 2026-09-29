import { z } from "zod";
import { requestSchema } from "./requestSchema.js";

// PostgreSQL's integer type tops out at 2147483647. An id beyond it could
// never exist, and passing it to the database would raise an error rather
// than a clean 404, so it is rejected here as a 400.
const MAX_DB_INT = 2_147_483_647;

export const getSubmissionSchema = requestSchema({
  params: z
    .object({
      id: z.coerce.number().int().positive().max(MAX_DB_INT),
    })
    .strict(),
});
