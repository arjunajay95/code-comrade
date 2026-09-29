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

// Closes the connection pool once this file's tests finish, so the worker
// can exit instead of waiting on open database connections. Imported
// dynamically so it resolves to the same module instance the tests used.
afterAll(async () => {
  const { prisma, pool } = await import("../../src/config/prisma.js");
  await prisma.$disconnect();
  await pool.end();
});
