import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { httpLogger } from "./middlewares/httpLogger.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { REQUEST_ID_HEADER, requestId } from "./middlewares/requestId.js";
import { requestTimeout } from "./middlewares/requestTimeout.js";
import { apiRouter } from "./routes/index.js";

// Builds the app without starting a server, so integration tests can
// import it and send requests directly without binding a port.
export const createApp = (): Express => {
  const app = express();

  // The exact number of proxies in front of the app 0
  // locally, 1 behind Render's proxy. Too low and every client shares the
  // proxy's IP and one rate limit bucket. Too high and a forged
  // X-Forwarded-For header can pick its own bucket.
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  // The binding order starts here.
  app.use(requestId);
  app.use(httpLogger);

  // Security headers on every response. Also removes the X-Powered-By
  // header, which would otherwise advertise that this is Express.
  app.use(helmet());

  app.use(
    cors({
      // Only the frontend URLs in ALLOWED_ORIGINS get CORS headers back.
      // Any other origin gets no Access-Control-Allow-Origin header, so the
      // browser blocks the response. Never a wildcard, since this API
      // receives Authorization headers.
      origin: env.ALLOWED_ORIGINS,

      // Headers the frontend is allowed to send. Idempotency-Key is the
      // header D-29 uses for safe retries on write endpoints.
      allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],

      // Browsers hide custom response headers from frontend code unless
      // they are explicitly exposed. Without this, the frontend could never
      // read the request id to show it in an error message.
      exposedHeaders: [REQUEST_ID_HEADER],
    }),
  );

  app.use(compression());

  // Anything larger than BODY_LIMIT is rejected before it is parsed. The
  // error handler turns that into 413 PAYLOAD_TOO_LARGE.
  app.use(express.json({ limit: env.BODY_LIMIT }));

  app.use(requestTimeout);
  app.use("/api/v1", globalLimiter);

  // Phase 3: clerkMiddleware() is registered here, after the global
  // limiter and before the routes.

  app.use("/api/v1", apiRouter);

  // Both must come after every route. The 404 handler catches anything
  // that matched nothing, and the error handler catches everything else.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
