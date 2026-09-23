// Express's built-in Request type has no id field. This merges one in
// globally, so req.id is typed as a string everywhere in the app without
// any casting. The name "id" is deliberate: pino-http reads req.id by
// convention, which the logger in the next step relies on.
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Marks this file as a module. Without at least one export, TypeScript
// treats it as a global script and the "declare global" block above is
// rejected.
export {};
