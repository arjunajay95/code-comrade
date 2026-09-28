import { createClerkClient } from "@clerk/express";
import { env } from "./env.js";

// Clerk's Backend API client. Used only on a user's first request, to read
// their profile for username derivation.
export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,

  // Against a development instance, the SDK prints a telemetry notice to
  // stdout and sends usage data to Clerk. The notice would land as plain
  // text in the middle of the JSON log stream, and the server has no
  // reason to send the data.
  telemetry: { disabled: true },
});
