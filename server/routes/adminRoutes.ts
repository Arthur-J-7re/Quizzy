import { Router } from "express";
import userManager from "../function/userManager";
import statsManager from "../function/statsManager";
import token from "../utils/jwt";
import requireRole from "../utils/requireRole";
import asyncHandler from "../utils/asyncHandler";
import { HttpError } from "../utils/errorHandler";
import { setRoleSchema } from "../validation/adminSchemas";

const routes = Router();

// Toutes les routes admin passent d'abord par verifyToken (pour avoir un
// user_id), puis par requireRole pour vérifier le rôle en base.
routes.use(token.verifyToken, requireRole(["superadmin"]));

routes.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json(await statsManager.getDashboard());
  })
);

routes.get(
  "/users",
  asyncHandler(async (req, res) => {
    // "user" ajouté ici (au-delà de admin/superadmin) pour permettre de
    // vérifier le rôle courant d'un compte trouvé via GET /user/search
    // avant de le promouvoir (cf. ROADMAP.md, Phase 6).
    const role = req.query.role === "superadmin" ? "superadmin" : req.query.role === "user" ? "user" : "admin";
    res.json(await userManager.listUsersByRole(role));
  })
);

routes.put(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) {
      throw new HttpError(400, "Identifiant d'utilisateur invalide.");
    }
    const { role } = setRoleSchema.parse(req.body);

    const retour = await userManager.setRole(targetId, role);
    if (!retour.success) {
      throw new HttpError(retour.message ? 404 : 500, retour.message ?? "La mise à jour du rôle a échoué.");
    }
    res.json(retour);
  })
);

export default routes;
