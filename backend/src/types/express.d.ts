// The local user attached by requireAuth. Deliberately has no clerkId: past
// the guard, code only ever sees the local id.
export interface AuthUser {
  id: number;
  username: string;
  karma: number;
}

// Express's built-in Request type has no id field. This merges one in
// globally, so req.id is typed as a string everywhere in the app without
// any casting. The name "id" is deliberate: pino-http reads req.id by
// convention.
declare global {
  namespace Express {
    interface Request {
      id: string;

      // Optional because only routes behind requireAuth have it. A public
      // route that reached for req.user would get undefined, and TypeScript
      // makes that impossible to ignore.
      user?: AuthUser;
    }
  }
}
