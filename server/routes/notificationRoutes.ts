import { Router } from "express";
import notificationManager from "../function/notificationManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const [items, unreadCount] = await Promise.all([
      notificationManager.getForUser(userId),
      notificationManager.getUnreadCount(userId),
    ]);
    res.json({ items, unreadCount });
  })
);

routes.put(
  "/:id/read",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const notification_id = Number(req.params.id);
    if (!Number.isFinite(notification_id)) {
      throw new HttpError(400, "Identifiant de notification invalide.");
    }
    res.json(await notificationManager.markRead(notification_id, userId));
  })
);

routes.put(
  "/read-all",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await notificationManager.markAllRead(getIdFromReq(req)));
  })
);

export default routes;
