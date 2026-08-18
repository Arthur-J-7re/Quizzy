import { Router } from "express";
import userManager from "../function/userManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import { HttpError } from "../utils/errorHandler";
import { updateUsernameSchema } from "../validation/userSchemas";

const routes = Router();

// Utilisé pour trouver qui ajouter en ami (cf. ROADMAP.md, Phase 5).
routes.get(
  "/search",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const query = String(req.query.q ?? "");
    res.json(await userManager.searchUsers(query, userId));
  })
);

routes.put(
  "/updateUsername",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    // L'id vient du token, jamais du body : sinon n'importe qui pouvait
    // renommer n'importe quel compte en passant un autre user_id.
    const user_id = getIdFromReq(req);
    const { username } = updateUsernameSchema.parse(req.body);

    if (await userManager.usernameExist(username)) {
      throw new HttpError(409, "Ce nom d'utilisateur est déjà pris.");
    }

    const retour = await userManager.updateUsername(user_id, username);
    if (!retour.success) {
      throw new HttpError(500, "La mise à jour du nom d'utilisateur a échoué.");
    }
    res.json(retour);
  })
);

export default routes;
