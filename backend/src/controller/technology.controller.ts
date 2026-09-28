import type { Request, Response } from "express";
import type { Pagination } from "../models/pagination.js";
import { technologyService } from "../service/technology.service.js";

export const technologyController = {
  // Public: no requireAuth, and nothing about the caller is read.
  async list(req: Request, res: Response): Promise<void> {
    const result = await technologyService.list(
      req.query as unknown as Pagination,
    );
    res.status(200).json({ success: true, ...result });
  },
};
