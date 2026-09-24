import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool, prisma } from "./config/prisma.js";

const app = createApp();

// Express 5 passes listen failures, a port already in use for example, to
// this callback instead of throwing. Without the check, a failed start
// would look like a successful one.
const server = app.listen(env.PORT, (error) => {
  if (error) {
    logger.fatal({ err: error }, "Server failed to start");
    process.exit(1);
  }
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server listening");
});

let isShuttingDown = false;

// D-35: stop accepting connections, drain in-flight requests, close the
// database pool, exit. Shared by the signal handlers and the fatal error
// handlers below.
const shutdown = async (reason: string, exitCode: number): Promise<void> => {
  // A second signal, or an error thrown during shutdown, must not start
  // the sequence again.
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ reason }, "Shutting down");

  // The hard timeout from D-35. If draining stalls, a request that never
  // finishes for example, the process exits anyway. unref() stops this
  // timer from keeping the process alive by itself once everything else
  // has closed.
  const forceExit = setTimeout(() => {
    logger.error(
      { timeoutMs: env.SHUTDOWN_TIMEOUT_MS },
      "Shutdown timed out, forcing exit",
    );
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  let finalCode = exitCode;

  try {
    // server.close() stops new connections immediately, then calls back
    // once every in-flight request has finished. That wait is the drain.
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    await prisma.$disconnect();
    await pool.end();

    logger.info("Shutdown complete");
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    finalCode = 1;
  }

  process.exit(finalCode);
};

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));

// D-35: both are fatal. The correlation id is only available for errors
// raised inside a request, and those already go through the error handler
// with their id attached. Anything reaching these handlers escaped request
// context entirely, so it is logged with full error details instead.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  void shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  void shutdown("uncaughtException", 1);
});
