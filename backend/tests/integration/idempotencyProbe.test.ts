import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma.js";
import {
  BadRequestError,
  ServiceUnavailableError,
} from "../../src/errors/index.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { httpLogger } from "../../src/middlewares/httpLogger.js";
import { idempotency } from "../../src/middlewares/idempotency.js";
import { requestId } from "../../src/middlewares/requestId.js";
import { idempotencyService } from "../../src/service/idempotency.service.js";
import { catchAsync } from "../../src/utils/catchAsync.js";
import { createUser, unique } from "./fixtures.js";

// The middleware's behaviour, tested on a small app of its own. The real
// routes cannot be made to answer 503 on cue, crash halfway or wait for the
// test to let them go, and these cases need exactly that. The real routes get
// their own tests in idempotency.test.ts.

// What the probe handler does, chosen by a header so that it never changes
// the request hash.
type Mode = "created" | "rejected" | "unavailable" | "gated" | "dated";

const runs = new Map<string, number>();
const runsOf = (id: string) => runs.get(id) ?? 0;

// A handler in "gated" mode waits here until the test lets it finish, so a
// request can be held in flight for as long as the test needs.
let release: () => void = () => undefined;
let gate: Promise<void> = Promise.resolve();
const closeGate = () => {
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
};

// Stands in for requireAuth: the middleware only needs req.user.
const asUser = (req: Request, _res: Response, next: NextFunction) => {
  const id = Number(req.get("X-Test-User"));
  if (Number.isInteger(id)) req.user = { id, username: "probe", karma: 0 };
  next();
};

const probe = catchAsync(async (req, res) => {
  const id = String(req.params.id);
  runs.set(id, runsOf(id) + 1);
  const mode = (req.get("X-Probe-Mode") ?? "created") as Mode;

  if (mode === "gated") await gate;
  if (mode === "rejected") {
    throw new BadRequestError(
      "The probe rejected this request",
      "VALIDATION_ERROR",
    );
  }
  if (mode === "unavailable") {
    throw new ServiceUnavailableError(
      "The probe is unavailable",
      "SERVICE_UNAVAILABLE",
    );
  }

  const data =
    mode === "dated"
      ? {
          at: new Date("2026-10-05T10:00:00.000Z"),
          nested: { b: 1, a: [2, { d: 4, c: 3 }] },
        }
      : { run: runsOf(id) };
  res.status(201).json({ success: true, data });
});

const app = express();
app.use(requestId);
app.use(httpLogger);
app.use(express.json());
app.post("/probe/:id", asUser, idempotency, probe);
app.post("/other/:id", asUser, idempotency, probe);
app.use(errorHandler);

const send = (
  userId: number | undefined,
  path: string,
  options: { key?: string; body?: unknown; mode?: Mode } = {},
) => {
  const req = request(app).post(path);
  if (userId !== undefined) req.set("X-Test-User", String(userId));
  if (options.key !== undefined) req.set("Idempotency-Key", options.key);
  if (options.mode) req.set("X-Probe-Mode", options.mode);
  return req.send((options.body ?? {}) as object);
};

// Starts a request now and hands back a promise for its response, so the test
// can do other things while it is held in flight.
const start = (...args: Parameters<typeof send>) =>
  send(...args).then((res) => res);

const rowFor = (userId: number, key: string) =>
  prisma.idempotencyKey.findFirst({ where: { userId, key } });

const waitFor = async (condition: () => boolean) => {
  for (let i = 0; i < 200; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the handler to start");
};

const newCase = async () => ({
  user: await createUser(),
  id: unique("probe"),
  key: unique("key").replace(/_/g, "-"),
});

describe("the Idempotency-Key middleware", () => {
  describe("without the header", () => {
    it("does nothing: every request runs and nothing is recorded", async () => {
      const { user, id } = await newCase();

      const first = await send(user.id, `/probe/${id}`);
      const second = await send(user.id, `/probe/${id}`);

      expect([first.status, second.status]).toEqual([201, 201]);
      expect(runsOf(id)).toBe(2);
      expect(
        await prisma.idempotencyKey.count({ where: { userId: user.id } }),
      ).toBe(0);
    });
  });

  describe("a malformed header", () => {
    it.each<[string, string]>([
      ["", "empty"],
      ["x".repeat(129), "129 characters"],
      ["has space", "a space"],
      ["bad!char", "punctuation"],
      ["dots.are.out", "dots"],
      ["a,b", "a comma"],
    ])("%j (%s) is refused with 400 and records nothing", async (key) => {
      const { user, id } = await newCase();

      const res = await send(user.id, `/probe/${id}`, { key });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("Idempotency-Key");
      expect(runsOf(id)).toBe(0);
      expect(
        await prisma.idempotencyKey.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it.each([
      ["a"],
      ["x".repeat(128)],
      ["3f1c2a9e-8b7d-4e6f-9a1b-2c3d4e5f6a7b"],
      ["A_b-9"],
    ])("%j is accepted", async (key) => {
      const { user, id } = await newCase();

      const res = await send(user.id, `/probe/${id}`, { key });

      expect(res.status).toBe(201);
      expect(await rowFor(user.id, key)).not.toBeNull();
    });
  });

  describe("a request without a session", () => {
    it("is refused with 401 and records nothing", async () => {
      const { id, key } = await newCase();

      const res = await send(undefined, `/probe/${id}`, { key });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(runsOf(id)).toBe(0);
      expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(0);
    });
  });

  describe("a first request", () => {
    it("is stored before the client sees the answer, and records only a hash", async () => {
      const { user, id, key } = await newCase();

      const res = await send(user.id, `/probe/${id}`, {
        key,
        body: { secret: "do-not-store-me" },
      });
      // No waiting: the row must already be complete when the response lands.
      const row = await rowFor(user.id, key);

      expect(res.status).toBe(201);
      expect(row).toMatchObject({
        status: "COMPLETED",
        responseCode: 201,
        endpoint: "POST /probe/:id",
      });
      expect(row?.responseBody).toEqual(res.body);
      expect(row?.requestHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(row)).not.toContain("do-not-store-me");
    });
  });

  describe("the order of storing and sending", () => {
    it("finishes storing the response before the client is sent it", async () => {
      const { user, id, key } = await newCase();
      const store = idempotencyService.complete.bind(idempotencyService);
      let storedAt: number | undefined;
      // Storing is made slow, so a response that is sent first and stored
      // afterwards would reach the client well before the store finishes.
      const spy = vi
        .spyOn(idempotencyService, "complete")
        .mockImplementation(async (...args) => {
          await new Promise((resolve) => setTimeout(resolve, 150));
          await store(...args);
          storedAt = Date.now();
        });

      try {
        const res = await send(user.id, `/probe/${id}`, { key });
        const receivedAt = Date.now();

        expect(res.status).toBe(201);
        expect(storedAt).toBeDefined();
        expect(storedAt).toBeLessThanOrEqual(receivedAt);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("the same key and the same request again", () => {
    it("replays the stored response without running the handler", async () => {
      const { user, id, key } = await newCase();

      const first = await send(user.id, `/probe/${id}`, { key });
      const second = await send(user.id, `/probe/${id}`, { key });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body).toEqual(first.body);
      expect(second.body.data.run).toBe(1);
      expect(runsOf(id)).toBe(1);
    });

    it("treats a body with its keys in another order as the same request", async () => {
      const { user, id, key } = await newCase();

      await send(user.id, `/probe/${id}`, {
        key,
        body: { a: 1, b: { c: 2, d: 3 } },
      });
      const again = await send(user.id, `/probe/${id}`, {
        key,
        body: { b: { d: 3, c: 2 }, a: 1 },
      });

      expect(again.status).toBe(201);
      expect(runsOf(id)).toBe(1);
    });

    it("replays dates and nested JSON exactly as they were first sent", async () => {
      const { user, id, key } = await newCase();

      const first = await send(user.id, `/probe/${id}`, { key, mode: "dated" });
      const again = await send(user.id, `/probe/${id}`, { key, mode: "dated" });

      expect(first.body.data.at).toBe("2026-10-05T10:00:00.000Z");
      expect(again.body).toEqual(first.body);
      expect(again.body.data.nested).toEqual({ a: [2, { c: 3, d: 4 }], b: 1 });
      expect(runsOf(id)).toBe(1);
    });
  });

  describe("a stored 4xx", () => {
    it("is replayed, with this request's own id in the body and the header", async () => {
      const { user, id, key } = await newCase();

      const first = await send(user.id, `/probe/${id}`, {
        key,
        mode: "rejected",
      });
      const again = await send(user.id, `/probe/${id}`, {
        key,
        mode: "rejected",
      });

      expect(first.status).toBe(400);
      expect(again.status).toBe(400);
      expect(again.body.error.code).toBe(first.body.error.code);
      expect(again.body.error.message).toBe(first.body.error.message);
      // The envelope rule: the id in the body is the id in the header.
      expect(again.body.error.requestId).toBe(again.headers["x-request-id"]);
      expect(again.body.error.requestId).not.toBe(first.body.error.requestId);
      expect(runsOf(id)).toBe(1);
      expect((await rowFor(user.id, key))?.responseCode).toBe(400);
    });

    it("cannot be reused with a corrected body: the key describes one attempt", async () => {
      const { user, id, key } = await newCase();
      await send(user.id, `/probe/${id}`, {
        key,
        mode: "rejected",
        body: { n: 1 },
      });

      const corrected = await send(user.id, `/probe/${id}`, {
        key,
        body: { n: 2 },
      });

      expect(corrected.status).toBe(422);
      expect(corrected.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
      expect(runsOf(id)).toBe(1);
    });
  });

  describe("a 5xx", () => {
    it("is never stored: the key stays in flight and a retry has to wait", async () => {
      const { user, id, key } = await newCase();

      const failed = await send(user.id, `/probe/${id}`, {
        key,
        mode: "unavailable",
      });
      const row = await rowFor(user.id, key);
      const retry = await send(user.id, `/probe/${id}`, { key });

      expect(failed.status).toBe(503);
      expect(row).toMatchObject({ status: "IN_FLIGHT", responseCode: null });
      expect(retry.status).toBe(409);
      expect(retry.body.error.code).toBe("REQUEST_IN_PROGRESS");
      expect(runsOf(id)).toBe(1);
    });
  });

  describe("a different request under the same key", () => {
    it("is refused with 422 when the body differs, and the original still replays", async () => {
      const { user, id, key } = await newCase();
      const original = await send(user.id, `/probe/${id}`, {
        key,
        body: { n: 1 },
      });

      const other = await send(user.id, `/probe/${id}`, {
        key,
        body: { n: 2 },
      });
      const replay = await send(user.id, `/probe/${id}`, {
        key,
        body: { n: 1 },
      });

      expect(other.status).toBe(422);
      expect(other.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
      expect(replay.body).toEqual(original.body);
      expect(runsOf(id)).toBe(1);
    });

    it("is refused with 422 when only the id in the path differs", async () => {
      const { user, id, key } = await newCase();
      const otherId = unique("probe");
      await send(user.id, `/probe/${id}`, { key });

      const res = await send(user.id, `/probe/${otherId}`, { key });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
      expect(runsOf(otherId)).toBe(0);
    });
  });

  describe("scope", () => {
    it("belongs to one user: another user can use the same key", async () => {
      const { user, id, key } = await newCase();
      const someoneElse = await createUser();

      const mine = await send(user.id, `/probe/${id}`, { key });
      const theirs = await send(someoneElse.id, `/probe/${id}`, { key });

      expect([mine.status, theirs.status]).toEqual([201, 201]);
      expect(runsOf(id)).toBe(2);
      expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(2);
    });

    it("belongs to one endpoint: the same key elsewhere is a different key", async () => {
      const { user, id, key } = await newCase();

      const here = await send(user.id, `/probe/${id}`, { key });
      const there = await send(user.id, `/other/${id}`, { key });

      expect([here.status, there.status]).toEqual([201, 201]);
      expect(runsOf(id)).toBe(2);
      const endpoints = (
        await prisma.idempotencyKey.findMany({
          where: { userId: user.id, key },
        })
      )
        .map((r) => r.endpoint)
        .sort();
      expect(endpoints).toEqual(["POST /other/:id", "POST /probe/:id"]);
    });
  });

  describe("a request that arrives while the first is still running", () => {
    it("gets 409 until the first finishes, then gets the stored response", async () => {
      const { user, id, key } = await newCase();
      closeGate();
      const first = start(user.id, `/probe/${id}`, { key, mode: "gated" });
      await waitFor(() => runsOf(id) === 1);

      const during = await send(user.id, `/probe/${id}`, {
        key,
        mode: "gated",
      });
      release();
      const firstResponse = await first;
      const after = await send(user.id, `/probe/${id}`, { key, mode: "gated" });

      expect(during.status).toBe(409);
      expect(during.body.error.code).toBe("REQUEST_IN_PROGRESS");
      expect(firstResponse.status).toBe(201);
      expect(after.status).toBe(201);
      expect(after.body).toEqual(firstResponse.body);
      expect(runsOf(id)).toBe(1);
    });

    it("lets exactly one of two simultaneous first requests run", async () => {
      const { user, id, key } = await newCase();
      closeGate();

      const a = start(user.id, `/probe/${id}`, { key, mode: "gated" });
      const b = start(user.id, `/probe/${id}`, { key, mode: "gated" });
      const loser = await Promise.race([a, b]);
      release();
      const results = await Promise.all([a, b]);

      expect(loser.status).toBe(409);
      expect(loser.body.error.code).toBe("REQUEST_IN_PROGRESS");
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(runsOf(id)).toBe(1);
    });
  });

  describe("a stale key left in flight by a failure", () => {
    it("is taken over by exactly one of two simultaneous retries", async () => {
      const { user, id, key } = await newCase();
      const failed = await send(user.id, `/probe/${id}`, {
        key,
        mode: "unavailable",
      });
      // The tests run with the default timeout of 5 minutes.
      await prisma.idempotencyKey.updateMany({
        where: { userId: user.id, key },
        data: { createdAt: new Date(Date.now() - 10 * 60_000) },
      });
      closeGate();

      const a = start(user.id, `/probe/${id}`, { key, mode: "gated" });
      const b = start(user.id, `/probe/${id}`, { key, mode: "gated" });
      const loser = await Promise.race([a, b]);
      release();
      const results = await Promise.all([a, b]);
      const replay = await send(user.id, `/probe/${id}`, { key });

      expect(failed.status).toBe(503);
      expect(loser.status).toBe(409);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      // The failed first attempt, plus the one takeover. Never two takeovers.
      expect(runsOf(id)).toBe(2);
      expect(replay.status).toBe(201);
      expect((await rowFor(user.id, key))?.status).toBe("COMPLETED");
    });

    it("is not taken over while it is younger than the timeout", async () => {
      const { user, id, key } = await newCase();
      await send(user.id, `/probe/${id}`, { key, mode: "unavailable" });
      await prisma.idempotencyKey.updateMany({
        where: { userId: user.id, key },
        data: { createdAt: new Date(Date.now() - 4 * 60_000) },
      });

      const retry = await send(user.id, `/probe/${id}`, { key });

      expect(retry.status).toBe(409);
      expect(runsOf(id)).toBe(1);
    });
  });

  describe("when the response cannot be stored", () => {
    it("still answers the client", async () => {
      const { user, id, key } = await newCase();
      closeGate();
      const pending = start(user.id, `/probe/${id}`, { key, mode: "gated" });
      await waitFor(() => runsOf(id) === 1);
      // The row disappears while the handler runs, so storing the response fails.
      await prisma.idempotencyKey.deleteMany({
        where: { userId: user.id, key },
      });

      release();
      const res = await pending;

      expect(res.status).toBe(201);
      expect(await rowFor(user.id, key)).toBeNull();
    });
  });
});
