import { requestSchema } from "./requestSchema.js";

// Accepts no input at all. Any query parameter is rejected rather than
// silently ignored.
export const getMeSchema = requestSchema({});
