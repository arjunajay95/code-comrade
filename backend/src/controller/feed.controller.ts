import type { Request, Response } from "express";
import type { FeedQuery } from "../models/feed.schemas.js";
import { feedService } from "../service/feed.service.js";

export const feedController = {
  // Public: nothing about the caller is read.
  async listPublic(req: Request, res: Response): Promise<void> {
    const result = await feedService.listPublic(
      req.query as unknown as FeedQuery,
    );
    res.status(200).json({ success: true, ...result });
  },
};
