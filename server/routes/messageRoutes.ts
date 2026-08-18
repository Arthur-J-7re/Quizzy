import { Router } from "express";
import messageManager from "../function/messageManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

routes.get(
  "/conversations",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await messageManager.getConversationsList(getIdFromReq(req)));
  })
);

routes.get(
  "/conversations/:peerId",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const peerId = Number(req.params.peerId);
    if (!Number.isFinite(peerId)) {
      throw new HttpError(400, "Identifiant d'interlocuteur invalide.");
    }
    res.json(await messageManager.getConversation(getIdFromReq(req), peerId));
  })
);

routes.post(
  "/send",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const recipient = Number(req.body?.recipient);
    const content = String(req.body?.content ?? "");
    if (!Number.isFinite(recipient)) {
      throw new HttpError(400, "Identifiant de destinataire invalide.");
    }
    res.status(201).json(await messageManager.send(getIdFromReq(req), recipient, content));
  })
);

routes.get(
  "/unread-count",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json({ unreadCount: await messageManager.getUnreadCount(getIdFromReq(req)) });
  })
);

export default routes;
