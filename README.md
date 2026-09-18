# CodeComrade

CodeComrade is a peer code review platform. A developer posts a review
request pointing at a public GitHub repository, describes what they want
looked at, and defines between one and five custom evaluation criteria.
Other developers review the request with written feedback and a rating from
1 to 5 against every criterion the author defined. Reviewers earn karma for
the contribution, and a personalized feed reorders open requests according
to each signed-in user's declared technology stack, blended with recency.

This is a solo build. One engineer owns every layer: schema, API, frontend,
pipeline, deployment, and documentation.

## Product goals

1. Let developers request structured peer review on real code.
2. Let developers give structured review that is more useful than a comment
   thread, through author-defined criteria and per-criterion ratings.
3. Reward contribution with a karma total that is provable, not decorative.
4. Surface relevant requests to each user through a personalized feed.
5. Hold up under security review, load testing, and a walkthrough by an
   experienced engineer.

## The five invariants

These are the properties the system guarantees regardless of input. Each has
a database-level or transaction-level enforcement point and a dedicated
integration test.

- **INV-1:** karma comes from reviews only, at a fixed number of points each.
  Nothing else mints karma.
- **INV-2:** a user reviews any given submission at most once, and never
  their own.
- **INV-3:** reviews and criterion ratings are immutable once created.
- **INV-4:** nothing on the platform is ever deleted. Submissions can be
  edited by their author, but criteria lock at creation.
- **INV-5:** a write replayed with the same idempotency key produces the
  original response and no second row.

## Tech stack

- **Backend:** Express, TypeScript, ESM, Prisma 7 over PostgreSQL
- **Frontend:** Next.js App Router, TypeScript, Tailwind, TanStack Query,
  Zustand, React Hook Form
- **Auth:** Clerk
- **CI/CD:** GitHub Actions, Vercel, Render, Neon

## Repository layout

```
codecomrade/
├── frontend/          # Next.js App Router, TypeScript
├── backend/           # Express, TypeScript, ESM
├── openapi/           # openapi.yaml, the API contract
├── postman/           # Postman collection, secondary to OpenAPI
├── load/              # k6 scripts
├── .github/workflows/ # CI and CD
└── README.md
```

### Backend layout

```
backend/
├── src/
│   ├── config/            # env.ts, logger.ts, prisma.ts, constants.ts
│   ├── controller/        # thin controllers, one service call each
│   ├── service/           # business rules, ownership checks
│   ├── repository/        # all Prisma access, all transactions
│   ├── models/            # Zod request schemas
│   ├── middlewares/       # requireAuth, validate, rateLimiter, idempotency
│   ├── errors/            # AppError and subclasses
│   ├── utils/             # catchAsync, feedScoring, githubUrl
│   ├── jobs/              # scheduled job entry points
│   ├── routes/            # mounted under /api/v1 in app.ts
│   ├── generated/prisma/  # Prisma 7 generated client
│   ├── app.ts             # middleware chain and route mounting
│   └── index.ts           # server bootstrap, graceful shutdown
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── Dockerfile
```

## Response envelope

Every response, success or failure, uses one shape:

```jsonc
// success
{ "success": true, "data": { }, "meta": { } }   // meta only on lists

// error
{
  "success": false,
  "error": { "code": "FORBIDDEN", "message": "...", "requestId": "..." }
}
```

## Status

Under active development. This README will be rewritten as the project's
portfolio front door once the build is complete.
