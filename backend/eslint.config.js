import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
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
);
