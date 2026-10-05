import type { Request, Response } from "express";
import type {
  CreateSubmissionBody,
  UpdateSubmissionBody,
} from "../models/submission.schemas.js";
import { submissionService } from "../service/submission.service.js";
import { requireUser } from "../utils/requireUser.js";

export const submissionController = {
  // Public: no requireAuth, and nothing about the caller is read. The id has
  // already been validated and coerced to a number.
  async getById(req: Request, res: Response): Promise<void> {
    const data = await submissionService.getById(
      req.params.id as unknown as number,
    );
    res.status(200).json({ success: true, data });
  },

  // The author is the session user and nothing in the body can say otherwise:
  // the id comes from requireAuth, and the schema rejects any field it does
  // not list. The body has already been validated and normalized, so the cast
  // states a fact rather than a hope.
  async create(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const data = await submissionService.create(
      user.id,
      req.body as CreateSubmissionBody,
    );
    res.status(201).json({ success: true, data });
  },

  // The id is the one in the path, already validated and coerced. Whether this
  // user may edit that submission is decided in the service, where the 404
  // check comes before the 403 check.
  async update(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const data = await submissionService.update(
      req.params.id as unknown as number,
      user.id,
      req.body as UpdateSubmissionBody,
    );
    res.status(200).json({ success: true, data });
  },
};
