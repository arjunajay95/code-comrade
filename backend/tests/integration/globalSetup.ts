import { execSync } from "node:child_process";

// Hosts a test database is allowed to live on. In CI the Postgres service
// container is reached on localhost too. Anything else, a Neon host above
// all, is refused before the reset can run.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// One Clerk identity per slot in tests/integration/auth.ts.
const REQUIRED_TEST_USERS = 4;

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for integration tests.`);
  return value;
};

export default function setup(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: running in CI, where the job supplies the variables.
  }

  const testUrl = requireEnv("DATABASE_URL_TEST");

  // QA §3.2: the reset must never point at the development database.
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL.");
  }

  // And it must never point anywhere but this machine. A mistyped variable
  // cannot turn this into a reset of a real database.
  const { hostname } = new URL(testUrl);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to reset a non-local database host: ${hostname}`);
  }

  // Tests sign in as real users of a dedicated Clerk application, never the one
  // behind the development or production site, so a leaked CI secret cannot
  // reach the live user directory.
  const secretKey = requireEnv("CLERK_SECRET_KEY_TEST");
  const publishableKey = requireEnv("CLERK_PUBLISHABLE_KEY_TEST");
  if (
    !secretKey.startsWith("sk_test_") ||
    !publishableKey.startsWith("pk_test_")
  ) {
    throw new Error(
      "The Clerk test keys must be test keys (sk_test_ and pk_test_).",
    );
  }
  if (
    secretKey === process.env.CLERK_SECRET_KEY ||
    publishableKey === process.env.CLERK_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "The Clerk test keys must differ from the app's own keys. Use a separate Clerk application.",
    );
  }
  const userIds = requireEnv("CLERK_TEST_USER_IDS")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (
    userIds.length < REQUIRED_TEST_USERS ||
    userIds.some((id) => !id.startsWith("user_"))
  ) {
    throw new Error(
      `CLERK_TEST_USER_IDS needs at least ${REQUIRED_TEST_USERS} Clerk user ids starting with user_.`,
    );
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
