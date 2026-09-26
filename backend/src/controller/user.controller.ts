import type { Request, Response } from "express";
import { userService } from "../service/user.service.js";
import { requireUser } from "../utils/requireUser.js";

export const userController = {
  // Self-scoped by construction: the id comes from the session, never from
  // the request, so there is nothing to check ownership against
  async getMe(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const data = await userService.getMe(user.id);
    res.status(200).json({ success: true, data });
  },
};
