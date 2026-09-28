import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          // Pure logic only: no database, no network, no environment
          // variables. Fast enough to run on every save.
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          // The real Express app against a real PostgreSQL database (D-23).
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // Runs once, before any test file: guards and resets the test
          // database.
          globalSetup: ["tests/integration/globalSetup.ts"],
          // Runs in every test worker, before its test file is loaded:
          // points the app at the test database.
          setupFiles: ["tests/integration/setup.ts"],
          // Every file shares one database, so files run one at a time
          // instead of racing each other's data.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Generated code and type declarations are not our logic to measure.
      exclude: ["src/generated/**", "src/**/*.d.ts"],
      reporter: ["text", "html", "lcov"],
      // No thresholds yet. The scoped thresholds from D-23 are enforced from
      // Phase 4, once the service and repository layers have their tests.
    },
  },
});
