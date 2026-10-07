import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The service's decisions are what is under test, so the repository is
// replaced with a script of answers. The races it defends against, another
// request changing a row between two of its steps, cannot be made to happen
// on cue against a real database.
vi.mock("../../src/repository/idempotency.repository.js", () => ({
  idempotencyRepository: {
    insertInFlight: vi.fn(),
    find: vi.fn(),
    takeOver: vi.fn(),
    complete: vi.fn(),
  },
}));
vi.mock("../../src/config/env.js", () => ({
  env: { IDEMPOTENCY_INFLIGHT_TIMEOUT_MINUTES: 5 },
}));

import { idempotencyRepository } from "../../src/repository/idempotency.repository.js";
import { idempotencyService } from "../../src/service/idempotency.service.js";

const repo = vi.mocked(idempotencyRepository);

const NOW = new Date("2026-10-05T12:00:00.000Z");
const TIMEOUT_MS = 5 * 60_000;
const input = {
  userId: 7,
  endpoint: "POST /api/v1/submissions",
  key: "key-1",
  requestHash: "hash-of-this-request",
};

const existing = (overrides: Record<string, unknown> = {}) => ({
  id: 41,
  requestHash: input.requestHash,
  status: "IN_FLIGHT",
  responseCode: null,
  responseBody: null,
  createdAt: new Date(NOW.getTime() - 60_000),
  ...overrides,
});

const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (err: unknown) => err as { statusCode: number; code: string },
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("idempotencyService.begin", () => {
  describe("a key it has not seen", () => {
    it("records it and tells the caller to run the handler", async () => {
      repo.insertInFlight.mockResolvedValue(41);

      await expect(idempotencyService.begin(input)).resolves.toEqual({
        kind: "execute",
        recordId: 41,
      });
      expect(repo.insertInFlight).toHaveBeenCalledWith(input);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe("a key that has a stored response", () => {
    it("replays the stored status and body", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(
        existing({
          status: "COMPLETED",
          responseCode: 201,
          responseBody: { success: true, data: { id: 9 } },
        }),
      );

      await expect(idempotencyService.begin(input)).resolves.toEqual({
        kind: "replay",
        status: 201,
        body: { success: true, data: { id: 9 } },
      });
      expect(repo.takeOver).not.toHaveBeenCalled();
    });

    it("replays a stored 4xx just the same", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(
        existing({
          status: "COMPLETED",
          responseCode: 400,
          responseBody: { success: false },
        }),
      );

      await expect(idempotencyService.begin(input)).resolves.toMatchObject({
        kind: "replay",
        status: 400,
      });
    });

    it("looks the key up by user, endpoint and key", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(
        existing({ status: "COMPLETED", responseCode: 201, responseBody: {} }),
      );

      await idempotencyService.begin(input);

      expect(repo.find).toHaveBeenCalledWith(7, input.endpoint, "key-1");
    });
  });

  describe("a key used for a different request", () => {
    it.each<[string, Record<string, unknown>]>([
      [
        "that has a stored response",
        { status: "COMPLETED", responseCode: 201, responseBody: {} },
      ],
      ["that is still in flight", {}],
      [
        "that is in flight and stale",
        { createdAt: new Date(NOW.getTime() - 10 * TIMEOUT_MS) },
      ],
    ])("is refused with 422 when the key %s", async (_name, state) => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(existing({ ...state, requestHash: "other" }));

      const err = await rejection(idempotencyService.begin(input));

      expect(err).toMatchObject({
        statusCode: 422,
        code: "IDEMPOTENCY_KEY_REUSED",
      });
      // Checked before anything else, so a takeover never happens for the
      // wrong request.
      expect(repo.takeOver).not.toHaveBeenCalled();
    });
  });

  describe("a key still in flight", () => {
    it("answers 409 while the first request may still be running", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(existing());

      const err = await rejection(idempotencyService.begin(input));

      expect(err).toMatchObject({
        statusCode: 409,
        code: "REQUEST_IN_PROGRESS",
      });
      expect(repo.takeOver).not.toHaveBeenCalled();
    });

    // Rows are only ever written with the status and the response code
    // together, so these two states should not exist. If one ever did, the
    // safe reading is "in flight", never a replay of something half stored.
    it.each<[string, Record<string, unknown>]>([
      ["says IN_FLIGHT but carries a response code", { responseCode: 201 }],
      ["says COMPLETED but has no response code", { status: "COMPLETED" }],
    ])("never replays a row that %s", async (_name, state) => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(existing(state));

      const err = await rejection(idempotencyService.begin(input));

      expect(err).toMatchObject({ code: "REQUEST_IN_PROGRESS" });
    });

    it("treats a key exactly at the timeout as still young", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(
        existing({ createdAt: new Date(NOW.getTime() - TIMEOUT_MS) }),
      );

      const err = await rejection(idempotencyService.begin(input));

      expect(err).toMatchObject({ code: "REQUEST_IN_PROGRESS" });
      expect(repo.takeOver).not.toHaveBeenCalled();
    });

    it("takes over a key one millisecond past the timeout", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(
        existing({ createdAt: new Date(NOW.getTime() - TIMEOUT_MS - 1) }),
      );
      repo.takeOver.mockResolvedValue(true);

      await expect(idempotencyService.begin(input)).resolves.toEqual({
        kind: "execute",
        recordId: 41,
      });
    });

    it("hands the repository the exact cutoff, which is the timeout before now", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(
        existing({ createdAt: new Date(NOW.getTime() - 2 * TIMEOUT_MS) }),
      );
      repo.takeOver.mockResolvedValue(true);

      await idempotencyService.begin(input);

      expect(repo.takeOver).toHaveBeenCalledWith(
        41,
        new Date(NOW.getTime() - TIMEOUT_MS),
      );
    });
  });

  describe("losing a race", () => {
    const stale = () =>
      existing({ createdAt: new Date(NOW.getTime() - 2 * TIMEOUT_MS) });

    it("answers 409 when the winner of a takeover is still running", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.takeOver.mockResolvedValue(false);
      // First look: stale. After losing the takeover: the winner refreshed it.
      repo.find
        .mockResolvedValueOnce(stale())
        .mockResolvedValueOnce(existing({ createdAt: NOW }));

      const err = await rejection(idempotencyService.begin(input));

      expect(err).toMatchObject({ code: "REQUEST_IN_PROGRESS" });
      expect(repo.takeOver).toHaveBeenCalledTimes(1);
    });

    it("replays when the winner of a takeover has already finished", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.takeOver.mockResolvedValue(false);
      repo.find.mockResolvedValueOnce(stale()).mockResolvedValueOnce(
        existing({
          status: "COMPLETED",
          responseCode: 201,
          responseBody: { done: true },
        }),
      );

      await expect(idempotencyService.begin(input)).resolves.toEqual({
        kind: "replay",
        status: 201,
        body: { done: true },
      });
    });

    it("inserts again when the row vanished between the insert and the read", async () => {
      // The expiry job removed it. Second pass: no conflict, a clean insert.
      repo.insertInFlight.mockResolvedValueOnce(null).mockResolvedValueOnce(55);
      repo.find.mockResolvedValue(null);

      await expect(idempotencyService.begin(input)).resolves.toEqual({
        kind: "execute",
        recordId: 55,
      });
      expect(repo.insertInFlight).toHaveBeenCalledTimes(2);
    });

    it("gives up with 409 after three passes instead of looping", async () => {
      repo.insertInFlight.mockResolvedValue(null);
      repo.find.mockResolvedValue(null);

      const err = await rejection(idempotencyService.begin(input));

      expect(err).toMatchObject({
        statusCode: 409,
        code: "REQUEST_IN_PROGRESS",
      });
      expect(repo.insertInFlight).toHaveBeenCalledTimes(3);
    });
  });

  it("lets any other error from the repository through", async () => {
    repo.insertInFlight.mockRejectedValue(new Error("database is down"));

    await expect(idempotencyService.begin(input)).rejects.toThrow(
      "database is down",
    );
  });
});

describe("idempotencyService.complete", () => {
  it("stores the body as the JSON the client received", async () => {
    repo.complete.mockResolvedValue(undefined);

    await idempotencyService.complete(41, 201, {
      success: true,
      data: {
        createdAt: new Date("2026-10-05T10:00:00.000Z"),
        skip: undefined,
      },
    });

    // A Date has become the ISO string it was sent as, and undefined is gone.
    expect(repo.complete).toHaveBeenCalledWith(41, 201, {
      success: true,
      data: { createdAt: "2026-10-05T10:00:00.000Z" },
    });
  });

  it("passes the status and the record id through", async () => {
    repo.complete.mockResolvedValue(undefined);

    await idempotencyService.complete(9, 404, { success: false });

    expect(repo.complete).toHaveBeenCalledWith(9, 404, { success: false });
  });
});
