import type { Request, Response } from "express";
import { BadRequestError } from "../errors/index.js";
import { idempotencyService } from "../service/idempotency.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  IDEMPOTENCY_KEY_PATTERN,
  endpointOf,
  hashRequest,
} from "../utils/idempotency.js";
import { requireUser } from "../utils/requireUser.js";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

// A stored error body carries the id of the request that first produced it.
// The header on a replayed response carries this request's id, and the two
// must match (the envelope rule, PROJECT_BLUEPRINT section 3), so the id in
// the body is replaced. Success bodies have no id and pass through untouched.
const forThisRequest = (
  status: number,
  body: unknown,
  requestId: string,
): unknown => {
  if (status < 400 || typeof body !== "object" || body === null) return body;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return body;
  return { ...body, error: { ...error, requestId } };
};

// Takes over res.json so the response is stored before it is sent. Sending
// first and storing afterwards would leave a window in which a client that
// had seen the response and retried at once would find the key still in
// flight. A 5xx is never stored (PROJECT_BLUEPRINT section 9): the key stays
// in flight, and so does a response that something else already sent, such as
// the request timeout's 503.
const storeResponse = (req: Request, res: Response, recordId: number): void => {
  const send = res.json.bind(res);

  res.json = (body?: unknown): Response => {
    if (res.headersSent || res.statusCode >= 500) return send(body);

    const status = res.statusCode;
    void idempotencyService
      .complete(recordId, status, body)
      .catch((err: unknown) => {
        // The client still gets its answer. The key just stays in flight, and
        // a retry waits out the timeout, the same trade-off as a 5xx.
        req.log.error({ err }, "Could not store the response for a key");
      })
      .then(() => {
        if (!res.headersSent) send(body);
      });
    return res;
  };
};

// Runs after requireAuth and writeLimiter and before validate, so a request
// rejected earlier never consumes a key. Without the header it does nothing at
// all, which makes the guarantee opt-in (D-29).
export const idempotency = catchAsync(async (req, res, next) => {
  const key = req.get(IDEMPOTENCY_HEADER);
  if (key === undefined) {
    next();
    return;
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new BadRequestError(
      "Idempotency-Key must be 1 to 128 characters: letters, digits, hyphen and underscore",
      "VALIDATION_ERROR",
    );
  }

  const user = requireUser(req);
  const outcome = await idempotencyService.begin({
    userId: user.id,
    endpoint: endpointOf(req),
    key,
    requestHash: hashRequest(req.method, `${req.baseUrl}${req.path}`, req.body),
  });

  if (outcome.kind === "replay") {
    res
      .status(outcome.status)
      .json(forThisRequest(outcome.status, outcome.body, String(req.id)));
    return;
  }

  storeResponse(req, res, outcome.recordId);
  next();
});
