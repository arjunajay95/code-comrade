// Dev-only. Creates a Clerk session for a test user and prints a session
// token for it, so protected routes can be tested with real Clerk-signed
// tokens before the frontend exists (requireAuth is never mocked).
// Clerk session tokens expire after about a minute, so use the token right
// away.
//
// Usage: npm run token -- user_xxxxxxxx

import { clerkClient } from "../src/config/clerk.js";

const userId = process.argv[2];

if (!userId?.startsWith("user_")) {
  process.stderr.write(
    "Usage: npm run token -- <clerk user id, starting with user_>\n",
  );
  process.exit(1);
}

const session = await clerkClient.sessions.createSession({ userId });
const { jwt } = await clerkClient.sessions.getToken(session.id);

// Only the token on stdout, with nothing else, so a shell can capture it
// straight into a variable.
process.stdout.write(jwt);
