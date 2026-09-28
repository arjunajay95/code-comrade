// The only place routers are created. Every route defined through
// createRouter is recorded, so the API drift check (D-27) sees exactly what
// the app serves. An ESLint rule forbids importing express's Router
// anywhere else, so no route can bypass the record.

import { Router, type RequestHandler } from "express";

type Method = "get" | "post" | "put" | "patch" | "delete";

export interface RegisteredRoute {
  method: Method;
  path: string;
}

export const registeredRoutes: RegisteredRoute[] = [];

// Joins a base path and a route path without doubling or trailing slashes:
// "/technologies" + "/" is "/technologies", "/users" + "/me" is "/users/me".
const joinPath = (basePath: string, path: string): string =>
  `${basePath}${path}`.replace(/\/+$/, "") || "/";

export interface FeatureRouter {
  basePath: string;
  router: Router;
  get: (path: string, ...handlers: RequestHandler[]) => void;
  post: (path: string, ...handlers: RequestHandler[]) => void;
  put: (path: string, ...handlers: RequestHandler[]) => void;
  patch: (path: string, ...handlers: RequestHandler[]) => void;
  delete: (path: string, ...handlers: RequestHandler[]) => void;
}

// A router for one feature, mounted at basePath under /api/v1. Each route
// is recorded with its full path, then registered on a real Express router.
export const createRouter = (basePath: string): FeatureRouter => {
  const router = Router();

  const add =
    (method: Method) =>
    (path: string, ...handlers: RequestHandler[]): void => {
      registeredRoutes.push({ method, path: joinPath(basePath, path) });
      router[method](path, ...handlers);
    };

  return {
    basePath,
    router,
    get: add("get"),
    post: add("post"),
    put: add("put"),
    patch: add("patch"),
    delete: add("delete"),
  };
};

// Builds the /api/v1 router from feature routers, mounting each at its own
// basePath. The mount path comes from the same value the registry used, so
// the recorded paths and the real ones can never disagree.
export const mountRoutes = (features: FeatureRouter[]): Router => {
  const apiRouter = Router();
  for (const feature of features) {
    apiRouter.use(feature.basePath, feature.router);
  }
  return apiRouter;
};
