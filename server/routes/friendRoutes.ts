import { Router } from "express";
import friendshipManager from "../function/friendshipManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await friendshipManager.listFriends(getIdFromReq(req)));
  })
);

routes.get(
  "/pending",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await friendshipManager.listPendingReceived(getIdFromReq(req)));
  })
);

routes.post(
  "/request",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const recipient_id = Number(req.body?.recipient_id);
    if (!Number.isFinite(recipient_id)) {
      throw new HttpError(400, "Identifiant de destinataire invalide.");
    }
    res.status(201).json(await friendshipManager.sendRequest(getIdFromReq(req), recipient_id));
  })
);

routes.put(
  "/:id/accept",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const friendship_id = Number(req.params.id);
    if (!Number.isFinite(friendship_id)) {
      throw new HttpError(400, "Identifiant de demande invalide.");
    }
    res.json(await friendshipManager.acceptRequest(friendship_id, getIdFromReq(req)));
  })
);

routes.put(
  "/:id/decline",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const friendship_id = Number(req.params.id);
    if (!Number.isFinite(friendship_id)) {
      throw new HttpError(400, "Identifiant de demande invalide.");
    }
    res.json(await friendshipManager.declineRequest(friendship_id, getIdFromReq(req)));
  })
);

routes.delete(
  "/:friendId",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const friendId = Number(req.params.friendId);
    if (!Number.isFinite(friendId)) {
      throw new HttpError(400, "Identifiant d'ami invalide.");
    }
    res.json(await friendshipManager.removeFriend(getIdFromReq(req), friendId));
  })
);

export default routes;
