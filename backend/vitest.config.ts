import { defineConfig } from "vitest/config";
import AuditLastSequencer from "./tests/integration/sequencer.js";

export default defineConfig({
  test: {
    // Runs the post-suite audit after every other file (see the sequencer).
    sequence: { sequencer: AuditLastSequencer },
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
      // D-23: thresholds are scoped by path, not global, so the pressure sits
      // on the layers that hold invariants and transactions and not on thin
      // wrappers. Each glob is measured on its own, over all the files that
      // match it, and a global number is deliberately not set. The run fails
      // when any of these is missed.
      thresholds: {
        "src/service/**": { lines: 90, branches: 85 },
        "src/repository/**": { lines: 90, branches: 85 },
        "src/controller/**": { lines: 60, branches: 50 },
        "src/utils/feedScoring.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/utils/githubUrl.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
