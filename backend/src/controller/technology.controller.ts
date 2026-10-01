import type { Request, Response } from "express";
import { technologyService } from "../service/technology.service.js";
import type { ListTechnologiesQuery } from "../models/technology.schemas.js";

export const technologyController = {
  // Public: no requireAuth, and nothing about the caller is read.
  async list(req: Request, res: Response): Promise<void> {
    const result = await technologyService.list(
      req.query as unknown as ListTechnologiesQuery,
    );
    res.status(200).json({ success: true, ...result });
  },
};
