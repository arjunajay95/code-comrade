import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";
import { HEALTH_PATH_PREFIX } from "../config/constants.js";

export const httpLogger = pinoHttp({
  // Reuses the app's base logger, so level, redaction, and dev
  // pretty-printing all carry over with no second configuration.
  logger,

  // requestId runs before this middleware and has already set req.id.
  // Returning it here makes pino-http use that same id instead of
  // generating its own, so the response header and the logs always match.
  genReqId: (req) => req.id,

  // With this on, req.log only binds the request id (as reqId) instead of
  // the whole serialized request, which keeps every manual log line inside
  // a handler short while still carrying the correlation id.
  quietReqLogger: true,

  autoLogging: {
    // Skips the automatic per-request line for health probes (D-25), so
    // the uptime monitor does not flood the logs.
    ignore: (req) => req.url?.startsWith(HEALTH_PATH_PREFIX) ?? false,
  },

  // Maps outcomes to severity so a log platform can alert on errors
  // without parsing status codes. 4xx means the client did something
  // wrong, 5xx means the server did.
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
