import type { Request, Response } from "express";
import { submissionService } from "../service/submission.service.js";

export const submissionController = {
  // Public: no requireAuth, and nothing about the caller is read. The id has
  // already been validated and coerced to a number.
  async getById(req: Request, res: Response): Promise<void> {
    const data = await submissionService.getById(
      req.params.id as unknown as number,
    );
    res.status(200).json({ success: true, data });
  },
};
