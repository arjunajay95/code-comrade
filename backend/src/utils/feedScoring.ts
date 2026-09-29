// The personalized feed's ranking math (PROJECT_BLUEPRINT §6). Pure
// functions: no database, no clock, no input or output, so every result is
// exactly testable. Every constant comes from config/constants.ts (D-18).

import {
  FEED_HALF_LIFE_HOURS,
  FEED_RECENCY_WEIGHT,
  FEED_TAG_WEIGHT,
} from "../config/constants.js";

const MS_PER_HOUR = 60 * 60 * 1000;

// Decay rate for the chosen half-life: recency halves every
// FEED_HALF_LIFE_HOURS hours.
const LAMBDA = Math.LN2 / FEED_HALF_LIFE_HOURS;

// The share of the submission's tags that the user knows, from 0 to 1.
// Measured against the submission's tags, so a narrowly tagged post that
// fully matches beats a broad one sharing a single tag. Compared by
// Technology id. An empty user stack scores 0 everywhere, which is what makes
// the feed degrade to pure recency with no special case.
export const tagScore = (
  userTechIds: ReadonlySet<number>,
  submissionTechIds: readonly number[],
): number => {
  if (submissionTechIds.length === 0) return 0;

  let matched = 0;
  for (const id of submissionTechIds) {
    if (userTechIds.has(id)) matched++;
  }
  return matched / submissionTechIds.length;
};

// Exponential decay: 1 when brand new, 0.5 at one half-life, 0.25 at two.
// A negative age, from clock differences between machines, is treated as
// brand new instead of producing a score above 1.
export const recencyScore = (ageHours: number): number =>
  Math.exp(-LAMBDA * Math.max(0, ageHours));

// The blend of relevance and freshness. The two weights sum to 1, so the
// result stays between 0 and 1.
export const finalScore = (tag: number, recency: number): number =>
  FEED_TAG_WEIGHT * tag + FEED_RECENCY_WEIGHT * recency;

// Age in hours between a submission's creation and a given moment. The
// caller passes "now", so this stays pure and tests control the clock.
export const ageInHours = (createdAt: Date, now: Date): number =>
  (now.getTime() - createdAt.getTime()) / MS_PER_HOUR;

export interface Scored {
  id: number;
  score: number;
  createdAt: Date;
}

// The feed's sort order (PROJECT_BLUEPRINT §6): score, highest first, then
// newest first, then highest id. The last tiebreaker means two submissions
// can never compare equal, so paging over the sorted array is stable.
export const byScoreThenRecency = (a: Scored, b: Scored): number =>
  b.score - a.score ||
  b.createdAt.getTime() - a.createdAt.getTime() ||
  b.id - a.id;
