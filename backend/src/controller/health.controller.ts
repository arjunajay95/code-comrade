import type { Request, Response } from "express";
import { healthService } from "../service/health.service.js";

export const healthController = {
  // Touches nothing external. If this responds at all, the process is alive.
  live(_req: Request, res: Response): void {
    res.status(200).json({ success: true, data: { status: "ok" } });
  },

  // If the database is unreachable, checkReadiness throws and the error
  // handler turns it into the 503 envelope. Reaching the line below means
  // the check passed.
  async ready(_req: Request, res: Response): Promise<void> {
    await healthService.checkReadiness();
    res.status(200).json({ success: true, data: { status: "ready" } });
  },
};
