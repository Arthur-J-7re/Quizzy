import { Router } from "express";
import questionManager from "../function/questionManager";
import token from "../utils/jwt";
import requireRole from "../utils/requireRole";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import { HttpError } from "../utils/errorHandler";
import { rejectQuestionSchema } from "../validation/questionModerationSchemas";

const routes = Router();

// Toutes les routes de modération sont réservées aux admins/super admins.
routes.use(token.verifyToken, requireRole(["admin", "superadmin"]));

routes.get(
  "/backlog",
  asyncHandler(async (req, res) => {
    const tags = typeof req.query.tags === "string" && req.query.tags.length > 0
      ? req.query.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    res.json(await questionManager.getPendingBacklog({
      mode: req.query.mode ? String(req.query.mode) : undefined,
      tags,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }));
  })
);

routes.put(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const question_id = Number(req.params.id);
    if (!Number.isFinite(question_id)) {
      throw new HttpError(400, "Identifiant de question invalide.");
    }
    const retour = await questionManager.approveQuestion(question_id, req.body ?? {});
    if (!retour.success) {
      throw new HttpError(500, "L'approbation de la question a échoué.");
    }
    res.json(retour);
  })
);

routes.put(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const question_id = Number(req.params.id);
    if (!Number.isFinite(question_id)) {
      throw new HttpError(400, "Identifiant de question invalide.");
    }
    const { reason } = rejectQuestionSchema.parse(req.body);
    const retour = await questionManager.rejectQuestion(question_id, reason);
    if (!retour.success) {
      throw new HttpError(500, "Le refus de la question a échoué.");
    }
    res.json(retour);
  })
);

routes.put(
  "/:id/claim",
  asyncHandler(async (req, res) => {
    const question_id = Number(req.params.id);
    if (!Number.isFinite(question_id)) {
      throw new HttpError(400, "Identifiant de question invalide.");
    }
    const retour = await questionManager.claimQuestionReview(question_id, getIdFromReq(req));
    if (!retour.success) {
      throw new HttpError(409, retour.message ?? "Impossible de prendre cette question en review.");
    }
    res.json(retour);
  })
);

routes.put(
  "/:id/release",
  asyncHandler(async (req, res) => {
    const question_id = Number(req.params.id);
    if (!Number.isFinite(question_id)) {
      throw new HttpError(400, "Identifiant de question invalide.");
    }
    res.json(await questionManager.releaseQuestionReview(question_id));
  })
);

export default routes;
