// D-27: fails if the routes the app serves and the routes in
// openapi/openapi.yaml differ in either direction. Run in CI on every pull
// request and push.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

// Loads backend/.env when run locally. In CI there is no .env file, the
// job supplies placeholder variables instead, so a missing file is fine.
try {
  process.loadEnvFile();
} catch {
  // Running in CI.
}

// Imported dynamically, after the environment is loaded. A static import
// would run env.ts before the .env file above had been read.
const { registeredRoutes } = await import("../src/routes/registry.js");
await import("../src/routes/index.js");

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

// Express writes a path parameter as :username, OpenAPI as {username}.
const toOpenApiPath = (path: string): string => path.replace(/:(\w+)/g, "{$1}");

const specPath = fileURLToPath(
  new URL("../../openapi/openapi.yaml", import.meta.url),
);
const spec = parse(readFileSync(specPath, "utf8")) as {
  paths: Record<string, Record<string, unknown>>;
};

const specRoutes = new Set<string>();
for (const [path, operations] of Object.entries(spec.paths)) {
  for (const method of METHODS) {
    if (method in operations) specRoutes.add(`${method.toUpperCase()} ${path}`);
  }
}

const codeRoutes = new Set(
  registeredRoutes.map(
    (r) => `${r.method.toUpperCase()} ${toOpenApiPath(r.path)}`,
  ),
);

const undocumented = [...codeRoutes].filter((r) => !specRoutes.has(r)).sort();
const unimplemented = [...specRoutes].filter((r) => !codeRoutes.has(r)).sort();

if (undocumented.length || unimplemented.length) {
  if (undocumented.length) {
    process.stderr.write(
      `Served but not in openapi.yaml:\n  ${undocumented.join("\n  ")}\n`,
    );
  }
  if (unimplemented.length) {
    process.stderr.write(
      `In openapi.yaml but not served:\n  ${unimplemented.join("\n  ")}\n`,
    );
  }
  process.exit(1);
}

process.stdout.write(
  `API drift check passed: ${codeRoutes.size} routes match openapi.yaml.\n`,
);
process.exit(0);
