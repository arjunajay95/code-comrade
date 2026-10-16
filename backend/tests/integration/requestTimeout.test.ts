import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// REQUEST_TIMEOUT_MS is read once, when the middleware is imported, and the
// real default is 15 seconds. A test cannot wait that long, so this file sets a
// short one first. Each test file has its own copy of the module, so the
// other files keep the default.
vi.hoisted(() => {
  process.env.REQUEST_TIMEOUT_MS = "100";
});

import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { httpLogger } from "../../src/middlewares/httpLogger.js";
import { requestId } from "../../src/middlewares/requestId.js";
import { requestTimeout } from "../../src/middlewares/requestTimeout.js";

// A small app of its own, because no real route can be made slow on cue. It
// has the same front of the chain as the real one: the request id, the
// logger, the timeout, and the central error handler at the end.
const HANDLER_DELAY_MS = 1000;

let handlerFinished: () => void = () => undefined;
const finished = new Promise<void>((resolve) => {
  handlerFinished = resolve;
});
let triedToSendLate = false;

const app = express();
app.use(requestId);
app.use(httpLogger);
app.use(requestTimeout);
app.get("/slow", (_req, res) => {
  setTimeout(() => {
    // The timeout already answered. A real handler would try to send here and
    // Express would refuse, which the app must survive without a crash.
    triedToSendLate = res.headersSent;
    if (!res.headersSent) res.json({ success: true });
    handlerFinished();
  }, HANDLER_DELAY_MS);
});
app.get("/fast", (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});
app.use(errorHandler);

describe("the request timeout", () => {
  it("D-10 row 15: a request that outlives its timeout is 503 REQUEST_TIMEOUT", async () => {
    const startedAt = Date.now();

    const res = await request(app).get("/slow");
    const elapsed = Date.now() - startedAt;

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "REQUEST_TIMEOUT" },
    });
    expect(res.body.error.requestId).toBe(res.headers["x-request-id"]);
    expect(res.headers["cache-control"]).toBe("no-store");
    // The client was answered at the timeout, not when the handler finished.
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(HANDLER_DELAY_MS - 50);
  });

  it("lets the handler that ran too long finish without taking anything down", async () => {
    await finished;

    // It found the response already sent, and left it alone. Had it thrown,
    // vitest would report an unhandled error and fail this file.
    expect(triedToSendLate).toBe(true);
  });

  it("leaves a request that answers in time alone", async () => {
    const res = await request(app).get("/fast");

    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    // Waiting past the timeout shows that a response which already finished
    // is not answered a second time. A second answer would raise an error
    // that vitest reports as unhandled, and fail this file.
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
});
