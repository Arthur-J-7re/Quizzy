import { Router } from "express";
import folderManager from "../function/folderManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import assertOwner from "../utils/assertOwner";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

const ownsFolder = (userId: number, folder_id: number) =>
  assertOwner(userId, folder_id, folderManager.getCreatorOfFolder, "dossier");

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await folderManager.getFoldersByCreator(getIdFromReq(req)));
  })
);

routes.post(
  "/create",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const creator = getIdFromReq(req);
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      throw new HttpError(400, "Le nom du dossier est requis.");
    }
    const { success, folder } = await folderManager.create({ creator, name });
    if (!success || !folder?.folder_id) {
      throw new HttpError(400, "La création du dossier a échoué.");
    }
    res.status(201).json({ success: true, folder_id: folder.folder_id });
  })
);

routes.put(
  "/update",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const folder_id = Number(req.body?.folder_id);
    await ownsFolder(userId, folder_id);
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      throw new HttpError(400, "Le nom du dossier est requis.");
    }
    res.json(await folderManager.update({ folder_id, name }));
  })
);

routes.delete(
  "/delete",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const folder_id = Number(req.body?.folder_id);
    await ownsFolder(userId, folder_id);
    res.json(await folderManager.deleteFolder(folder_id));
  })
);

export default routes;
