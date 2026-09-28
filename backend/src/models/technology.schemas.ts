import { paginationQuery } from "./pagination.js";
import { requestSchema } from "./requestSchema.js";

// Public and paginated like every other list (D-16). No search parameter:
// none is specified yet, and whether the tag picker needs one is decided
// when the frontend builds it.
export const listTechnologiesSchema = requestSchema({ query: paginationQuery });
