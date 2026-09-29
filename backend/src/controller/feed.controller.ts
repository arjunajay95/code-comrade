import type { Request, Response } from "express";
import { feedService } from "../service/feed.service.js";
import { env } from "../config/env.js";
import type {
  FeedQuery,
  PersonalizedFeedQuery,
} from "../models/feed.schemas.js";
import { isDebugScoreAllowed } from "../utils/feedScoring.js";
import { requireUser } from "../utils/requireUser.js";

export const feedController = {
  // Public: nothing about the caller is read.
  async listPublic(req: Request, res: Response): Promise<void> {
    const result = await feedService.listPublic(
      req.query as unknown as FeedQuery,
    );
    res.status(200).json({ success: true, ...result });
  },

  // Scored for the signed-in user. Whether the score breakdown appears is
  // decided here, from the request and the environment, by the unit-tested
  // rule in feedScoring.ts.
  async listPersonalized(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const query = req.query as unknown as PersonalizedFeedQuery;
    const includeScore = isDebugScoreAllowed(query.debug, env.NODE_ENV);

    const result = await feedService.listPersonalized(
      user.id,
      query,
      includeScore,
    );
    res.status(200).json({ success: true, ...result });
  },
};
