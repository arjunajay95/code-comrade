import { execSync } from "node:child_process";

// Hosts a test database is allowed to live on. In CI the Postgres service
// container is reached on localhost too. Anything else, a Neon host above
// all, is refused before the reset can run.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export default function setup(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: running in CI, where the job supplies the variables.
  }

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error("DATABASE_URL_TEST is required for integration tests.");
  }

  // The reset must never point at the development database.
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL.");
  }

  // And it must never point anywhere but this machine. A mistyped variable
  // cannot turn this into a reset of a real database.
  const { hostname } = new URL(testUrl);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to reset a non-local database host: ${hostname}`);
  }

  // Drops everything in the test database and reapplies every migration,
  // so each run starts from exactly the current schema. The Prisma CLI reads
  // DIRECT_URL, so the test URL is passed to it that way, for this one
  // command only. --no-install guarantees the project's own Prisma runs.
  execSync("npx --no-install prisma migrate reset --force", {
    stdio: "inherit",
    env: { ...process.env, DIRECT_URL: testUrl },
  });
}
