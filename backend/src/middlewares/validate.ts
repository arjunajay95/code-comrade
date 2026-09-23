import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { BadRequestError } from "../errors/index.js";

export const validate =
  (schema: z.ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      // Express 5 leaves req.body undefined when a request has no body,
      // a plain GET for example. Treating that as an empty object lets
      // the strict empty-body schema pass instead of failing on undefined.
      body: req.body ?? {},
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      // Turns each Zod issue into "body.title: Required" style text so a
      // client can see exactly which field failed. String() guards against
      // symbol path segments, which would otherwise crash join().
      const message = result.error.issues
        .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`)
        .join("; ");

      next(new BadRequestError(message, "VALIDATION_ERROR"));
      return;
    }

    const data = result.data as {
      body: unknown;
      query: unknown;
      params: unknown;
    };

    req.body = data.body;
    req.params = data.params as Request["params"];

    // Express 5 defines req.query as a read-only getter, so a plain
    // assignment throws. Redefining the property is the supported way to
    // swap in the parsed version.
    Object.defineProperty(req, "query", {
      value: data.query,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    next();
  };
