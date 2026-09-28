import { randomInt } from "node:crypto";
import { clerkClient } from "../config/clerk.js";
import { ServiceUnavailableError } from "../errors/index.js";
import { userRepository } from "../repository/user.repository.js";
import type { AuthUser } from "../types/express.js";
import { deriveBaseUsername, withSuffix } from "../utils/deriveUsername.js";

// One plain attempt, then four with a random suffix. With random 4-digit
// suffixes, running out is realistically impossible, but it still has a
// defined, non-500 answer.
const MAX_CREATE_ATTEMPTS = 5;

export const authService = {
  // Returns the local user for a Clerk session, creating it on the first
  // request.
  async resolveUser(clerkId: string): Promise<AuthUser> {
    // Step 1: nearly every request ends here. One indexed read, no Clerk call.
    const existing = await userRepository.findAuthUserByClerkId(clerkId);
    if (existing) return existing;

    // Step 2: first request only. Fetch the profile to derive a username.
    let base: string;
    try {
      const profile = await clerkClient.users.getUser(clerkId);
      base = deriveBaseUsername({
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    } catch (err) {
      throw new ServiceUnavailableError(
        "Could not set up your account, please retry",
        "SERVICE_UNAVAILABLE",
        { cause: err },
      );
    }

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
      // Random rather than sequential, so a popular name never needs a long
      // run of attempts to find a free one.
      const candidate =
        attempt === 0 ? base : withSuffix(base, randomInt(1000, 10000));

      const created = await userRepository.createAuthUser(clerkId, candidate);
      if (created) return created;

      // Step 3: a unique constraint rejected the insert. If a row for this
      // Clerk user exists now, a concurrent first request created it, so use
      // that one. If not, the username was taken: step 4, try a new suffix.
      const raced = await userRepository.findAuthUserByClerkId(clerkId);
      if (raced) return raced;
    }

    throw new ServiceUnavailableError(
      "Could not set up your account, please retry",
      "SERVICE_UNAVAILABLE",
    );
  },
};
