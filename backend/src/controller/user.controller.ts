import type { Request, Response } from "express";
import { userService } from "../service/user.service.js";
import { requireUser } from "../utils/requireUser.js";
import type { UpdateMeBody } from "../models/user.schemas.js";

export const userController = {
  // Self-scoped by construction: the id comes from the session, never from
  // the request, so there is nothing to check ownership against
  async getMe(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const data = await userService.getMe(user.id);
    res.status(200).json({ success: true, data });
  },

  // Self-scoped by construction, like getMe. The body has already been
  // validated and normalized, so the cast states a fact rather than a hope.
  async updateMe(req: Request, res: Response): Promise<void> {
    const user = requireUser(req);
    const data = await userService.updateMe(user.id, req.body as UpdateMeBody);
    res.status(200).json({ success: true, data });
  },

  // Public: no requireAuth, and nothing about the caller is read. The
  // username has already been validated and normalized.
  async getPublicProfile(req: Request, res: Response): Promise<void> {
    const data = await userService.getPublicProfile(
      req.params.username as string,
    );
    res.status(200).json({ success: true, data });
  },
};
