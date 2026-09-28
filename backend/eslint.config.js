import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.strict,
  prettier,
  {
    rules: {
      // Logging goes through the configured Pino logger (D-20), never
      // console. The one justified exception is in config/env.ts.
      "no-console": "error",

      // A leading underscore marks a parameter or variable as intentionally
      // unused, typically because a signature requires it, as with Express's
      // four-parameter error handler.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Routes are created only through createRouter in routes/registry.ts,
    // so every route is visible to the API drift check (D-27). Importing
    // express's Router directly anywhere else would let a route skip it.
    files: ["src/**/*.ts"],
    ignores: ["src/routes/registry.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "express",
              importNames: ["Router"],
              message:
                "Create routers with createRouter from routes/registry.ts so the API drift check sees every route.",
            },
          ],
        },
      ],
    },
  },
);
