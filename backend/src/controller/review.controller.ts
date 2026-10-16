import type { Request, Response } from "express";
import type { CreateReviewBody } from "../models/review.schemas.js";
import { reviewService } from "../service/review.service.js";
import { requireUser } from "../utils/requireUser.js";

export const reviewController = {
  // The reviewer is the session user and nothing in the body can say
  // otherwise: the id comes from requireAuth, and the schema rejects any
  // field it does not list. The submission id is the one in the path, already
  // validated and coerced to a number.
  async create(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const data = await reviewService.create(
      req.params.id as unknown as number,
      user,
      req.body as CreateReviewBody,
    );
    res.status(201).json({ success: true, data });
  },
};
