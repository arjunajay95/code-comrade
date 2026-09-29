# Feed Demonstration

The same 15 submissions, ranked for two users with different technology stacks, compared with the public feed. Captured from the running API with `?debug=1`, which adds a score breakdown to every personalized item.

- **Captured:** 2026-09-29, around 05:27 UTC
- **Data:** the development seed, run locally
- **Why locally:** the `_score` breakdown is only returned outside production (PROJECT_BLUEPRINT §6), so a demonstration with scores can only be captured in development

## The two users

| User | Technology stack |
|---|---|
| `alice_frontend` | react, nextjs, typescript, zustand |
| `bob_backend` | nodejs, express, postgresql, prisma |

Neither user sees anything the other cannot. The candidate set is identical: the 200 most recent submissions, here all 15. Only the order changes.

## How a score is computed

For a signed-in user U and a submission S (PROJECT_BLUEPRINT §6):

```
tagScore    = |tags(U) ∩ tags(S)| / |tags(S)|        0 to 1
recency     = exp(-ln(2) / 72 × ageInHours(S))       1 when new, 0.5 at 72 hours
finalScore  = 0.7 × tagScore + 0.3 × recency
```

Items are sorted by `finalScore`, highest first, then newest first, then highest id. The weights and the 72-hour half-life live in `backend/src/config/constants.ts`.

The tag score is measured against the **submission's** tags, not the user's. A narrowly tagged submission that fully matches a user outranks a broadly tagged one that shares a single tag.

## Alice's feed

| # | Submission | Matched tags | Age | Tag | Recency | Final |
|---|---|---|---|---|---|---|
| 1 | Dashboard UI kit | nextjs, react, typescript | 24h | 1 | 0.7948 | **0.9385** |
| 2 | Form validator | react, typescript | 120h | 1 | 0.3154 | **0.7946** |
| 3 | State management demo | nextjs, react, zustand | 192h | 1 | 0.1577 | **0.7473** |
| 4 | Notes app | react, typescript | 24h | 0.5 | 0.7948 | 0.5885 |
| 5 | Blog platform | typescript | 30h | 0.3333 | 0.7502 | 0.4584 |
| 6 | Todo app | react | 120h | 0.5 | 0.3154 | 0.4446 |
| 7 | Task manager | react | 48h | 0.3333 | 0.6309 | 0.4226 |
| 8 | Chat widget | react | 96h | 0.3333 | 0.3974 | 0.3526 |
| 9 | Payments API | none | 24h | 0 | 0.7948 | 0.2385 |
| 10 | Auth service | none | 30h | 0 | 0.7502 | 0.2251 |
| 11 | Data scraper | none | 48h | 0 | 0.6309 | 0.1893 |
| 12 | Deploy scripts | none | 72h | 0 | 0.5007 | 0.1502 |
| 13 | ML pipeline | none | 72h | 0 | 0.5007 | 0.1502 |
| 14 | CI pipeline | none | 96h | 0 | 0.3974 | 0.1192 |
| 15 | Queue worker | none | 192h | 0 | 0.1577 | 0.0473 |

## Bob's feed

| # | Submission | Matched tags | Age | Tag | Recency | Final |
|---|---|---|---|---|---|---|
| 1 | Payments API | express, nodejs, postgresql, prisma | 24h | 1 | 0.7948 | **0.9384** |
| 2 | Auth service | express, nodejs, prisma | 30h | 1 | 0.7502 | **0.9251** |
| 3 | Queue worker | nodejs, prisma | 192h | 1 | 0.1577 | **0.7473** |
| 4 | Blog platform | nodejs, postgresql | 30h | 0.6667 | 0.7502 | 0.6917 |
| 5 | Task manager | nodejs, postgresql | 48h | 0.6667 | 0.6308 | 0.6559 |
| 6 | Notes app | nodejs, postgresql | 24h | 0.5 | 0.7948 | 0.5884 |
| 7 | CI pipeline | nodejs | 96h | 0.5 | 0.3974 | 0.4692 |
| 8 | Chat widget | express | 96h | 0.3333 | 0.3974 | 0.3526 |
| 9 | Dashboard UI kit | none | 24h | 0 | 0.7948 | 0.2384 |
| 10 | Data scraper | none | 48h | 0 | 0.6308 | 0.1893 |
| 11 | Deploy scripts | none | 72h | 0 | 0.5007 | 0.1502 |
| 12 | ML pipeline | none | 72h | 0 | 0.5007 | 0.1502 |
| 13 | Form validator | none | 120h | 0 | 0.3154 | 0.0946 |
| 14 | Todo app | none | 120h | 0 | 0.3154 | 0.0946 |
| 15 | State management demo | none | 192h | 0 | 0.1577 | 0.0473 |

## The public feed, for comparison

The same for every visitor, signed in or not: newest first, with the same tiebreakers.

1. Notes app
2. Payments API
3. Dashboard UI kit
4. Blog platform
5. Auth service
6. Data scraper
7. Task manager
8. Deploy scripts
9. ML pipeline
10. Chat widget
11. CI pipeline
12. Form validator
13. Todo app
14. Queue worker
15. State management demo

## What the comparison shows

**The same submission lands in very different places.** Dashboard UI kit is first for Alice and ninth for Bob. Payments API is first for Bob and ninth for Alice. In the public feed they sit side by side at second and third.

**Relevance outweighs freshness.** State management demo is eight days old, yet it is third for Alice, ahead of the brand-new Notes app. A full match on her stack is worth 0.7 on its own, more than a half match plus a perfect recency score (0.5 × 0.7 + 1 × 0.3 = 0.65). Bob's feed shows the same effect with Queue worker.

**Freshness still matters among equals.** Alice's top three are all full matches. They are separated only by age: 24 hours, then 120, then 192.

**Full-stack work lands in the middle for both.** Notes app is tagged with two frontend and two backend technologies. Each user matches half of it, so it ranks fourth for Alice and sixth for Bob, well below their full matches and well above anything unrelated.

**Unrelated submissions still get seen.** Nothing scores zero. A submission matching none of a user's tags keeps its recency share, up to 0.3, so a brand-new post outside someone's stack still ranks above old posts outside it. The feed narrows, it does not filter.

**Ties are broken deterministically.** Deploy scripts and ML pipeline score exactly 0.1502 in both feeds and were created at the same moment. The higher id, Deploy scripts (11), comes first every time, so paging over the ranked list can never show a submission twice or skip one.

## A worked example

Dashboard UI kit is tagged nextjs, react and typescript, and was 24 hours old at capture.

**For Alice**, all three tags are in her stack:

```
tagScore   = 3 / 3                      = 1
recency    = exp(-ln(2) / 72 × 24)       = 0.7937
finalScore = 0.7 × 1 + 0.3 × 0.7937     = 0.9381
```

**For Bob**, none of them are:

```
tagScore   = 0 / 3                      = 0
finalScore = 0.7 × 0 + 0.3 × 0.7937     = 0.2381
```

At exactly 24 hours the recency is 0.7937. The captured value is 0.7948 because the submission was a few minutes younger than 24 hours when the request ran. The final scores differ by the same small amount.

The fourth decimal can also differ between the two users' captures, for example 0.9385 against 0.9384 for the top item, because the two requests ran seconds apart and each measures age from its own moment.

## Reproducing it

Scores depend on when they are captured, since recency keeps decaying after the seed runs. The order and the explanation above hold, but the exact numbers will not match a later capture.

1. Reset and seed the local database: `npx prisma migrate reset --force`, then `npx prisma db seed`.
2. Point the two seeded users at two real Clerk test users, so session tokens resolve to their rows. In the local database only:

   ```sql
   UPDATE "User" SET "clerkId" = '<clerk user id for alice>' WHERE username = 'alice_frontend';
   UPDATE "User" SET "clerkId" = '<clerk user id for bob>'   WHERE username = 'bob_backend';
   ```

3. With the API running, mint a token for each and request their feeds:

   ```
   npx tsx --env-file=.env scripts/mintSessionToken.ts <clerk user id>
   GET /api/v1/feed/personalized?debug=1&limit=15
   Authorization: Bearer <token>
   ```

4. Request `GET /api/v1/feed?limit=15` for the public order.
5. Restore the seed ids afterwards:

   ```sql
   UPDATE "User" SET "clerkId" = 'seed_user_1' WHERE username = 'alice_frontend';
   UPDATE "User" SET "clerkId" = 'seed_user_2' WHERE username = 'bob_backend';
   ```
