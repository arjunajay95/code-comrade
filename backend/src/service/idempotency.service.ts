import { env } from "../config/env.js";
import { ConflictError, UnprocessableError } from "../errors/index.js";
import {
  idempotencyRepository,
  type NewKey,
} from "../repository/idempotency.repository.js";

export type BeginOutcome =
  | { kind: "execute"; recordId: number }
  | { kind: "replay"; status: number; body: unknown };

// How many times begin() looks at a key before it gives up. Another pass
// happens only when a different request changed the row between two of this
// request's own steps, so needing more than a couple of passes means
// something is badly wrong, and "still in progress" is the safe answer.
const MAX_PASSES = 3;

const inProgress = () =>
  new ConflictError(
    "A request with this Idempotency-Key is still being processed",
    "REQUEST_IN_PROGRESS",
  );

export const idempotencyService = {
  // Decides what happens to a request that carries a key
  // (PROJECT_BLUEPRINT section 9). Either the handler should run, and the
  // caller gets the id of the row to store its response against, or the
  // stored response should be replayed. Everything else is an error.
  async begin(input: NewKey): Promise<BeginOutcome> {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const recordId = await idempotencyRepository.insertInFlight(input);
      if (recordId !== null) return { kind: "execute", recordId };

      const existing = await idempotencyRepository.find(
        input.userId,
        input.endpoint,
        input.key,
      );
      // Gone between the insert and the read, removed by the expiry job.
      // Insert again.
      if (!existing) continue;

      // A key describes one request. This check comes first, so a key that
      // is reused for a different request is refused whatever state it is in.
      if (existing.requestHash !== input.requestHash) {
        throw new UnprocessableError(
          "This Idempotency-Key was already used for a different request",
          "IDEMPOTENCY_KEY_REUSED",
        );
      }

      if (existing.status === "COMPLETED" && existing.responseCode !== null) {
        return {
          kind: "replay",
          status: existing.responseCode,
          body: existing.responseBody,
        };
      }

      // Still in flight. Younger than the timeout means the first request may
      // well still be running. A key exactly at the cutoff counts as young,
      // and the repository only takes over keys strictly older than it.
      const cutoff = new Date(
        Date.now() - env.IDEMPOTENCY_INFLIGHT_TIMEOUT_MINUTES * 60_000,
      );
      if (existing.createdAt >= cutoff) throw inProgress();

      if (await idempotencyRepository.takeOver(existing.id, cutoff)) {
        return { kind: "execute", recordId: existing.id };
      }
      // Another request took the key over first. Look again to see what it
      // did with it.
    }
    throw inProgress();
  },

  // Stores the response. The body is stored as the JSON the client received,
  // so a Date becomes the same ISO string it was sent as, and a replay is
  // identical to the original.
  complete(recordId: number, status: number, body: unknown): Promise<void> {
    return idempotencyRepository.complete(
      recordId,
      status,
      JSON.parse(JSON.stringify(body)),
    );
  },
};
