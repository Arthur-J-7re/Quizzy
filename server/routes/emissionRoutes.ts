import { Router } from "express";
import emissionManager from "../function/emissionManager";
import userManager from "../function/userManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import assertOwner from "../utils/assertOwner";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

const ownsEmission = (userId: number, emission_id: number) =>
  assertOwner(userId, emission_id, emissionManager.getCreatorOfEmission, "émission");

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await emissionManager.getEmissionByCreator(getIdFromReq(req)));
  })
);

// Résout par lot des émissions déjà connues par id (ouverture directe d'un
// lien d'édition, sans état de navigation) — ne renvoie que celles visibles
// par l'utilisateur (les siennes ou publiques).
routes.get(
  "/by-ids",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));
    const emissions = await emissionManager.getEmissionsByIds(ids);
    res.json(emissions.filter((e: any) => e.creator === userId || e.private === false));
  })
);

routes.get(
  "/available-emissions",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await emissionManager.getAvailableEmissions(getIdFromReq(req)));
  })
);

routes.get(
  "/public-emissions",
  asyncHandler(async (_req, res) => {
    res.json(await emissionManager.getPublicEmissions());
  })
);

routes.post(
  "/create",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const creator = getIdFromReq(req);
    const emission = await emissionManager.create({ ...req.body, creator });
    if (!emission.success || !emission.emission_id) {
      throw new HttpError(400, "La création de l'émission a échoué.");
    }
    await userManager.addEmissionToUser(creator, emission.emission_id);
    res.status(201).json({ success: true, emission_id: emission.emission_id });
  })
);

routes.put(
  "/update",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const { emission_id, data } = req.body ?? {};
    await ownsEmission(userId, Number(emission_id));
    // emission_id vit hors de `data` dans le payload : oublié ici, l'update
    // échouait systématiquement faute de trouver le document à modifier.
    res.json(await emissionManager.update({ ...data, emission_id, creator: userId }));
  })
);

routes.delete(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    // DELETE porte un corps JSON (cf. requestScheme.ts), pas de query string :
    // lire req.query ici renvoyait toujours NaN et la suppression échouait
    // systématiquement avec "Identifiant de émission invalide."
    const emission_id = Number(req.body?.emission_id);
    await ownsEmission(userId, emission_id);
    const retour = await emissionManager.deleteEmission(emission_id);
    if (retour.success) {
      await userManager.deleteEmissionFromUser(userId, emission_id);
    }
    res.json(retour);
  })
);

export default routes;
