import { afterAll } from "vitest";

try {
  process.loadEnvFile();
} catch {
  // Running in CI.
}

// The app reads DATABASE_URL. Pointing it at the test database here, before
// any test file imports the app, means no test can ever touch development
// data. globalSetup has already checked this URL is local and separate.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.NODE_ENV = "test";

// Only errors reach the console during tests, so failures stay readable.
process.env.LOG_LEVEL = "error";

// The write limiter allows 5 requests a minute, and a suite sends far more
// than that from one address. This lifts the cap for test runs only, which is
// what the variable is for. The one test that checks the real limiter sets it
// back to false before it loads the app.
process.env.RATE_LIMIT_WRITE_TEST = "true";

// The app verifies tokens with these keys and the tests mint them with the
// same client, so both use the dedicated test application. globalSetup has
// already checked they differ from the app's own keys.
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY_TEST;
process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY_TEST;

// Closes the connection pool once this file's tests finish, so the worker
// can exit instead of waiting on open database connections. Imported
// dynamically so it resolves to the same module instance the tests used.
afterAll(async () => {
  const { prisma, pool } = await import("../../src/config/prisma.js");
  await prisma.$disconnect();
  await pool.end();
});
