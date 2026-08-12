import { Router } from "express";
import quizzManager from "../function/quizzManager";
import questionManager from "../function/questionManager";
import userManager from "../function/userManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import assertOwner from "../utils/assertOwner";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

const ownsQuizz = (userId: number, quizz_id: number) =>
  assertOwner(userId, quizz_id, quizzManager.getCreatorOfQuizz, "quizz");

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await quizzManager.getQuizzByCreator(getIdFromReq(req)));
  })
);

// Résout par lot des quizz déjà connus par id (ouverture directe d'un lien
// d'édition, sans état de navigation) — ne renvoie que ceux visibles par
// l'utilisateur (les siens ou publics).
routes.get(
  "/by-ids",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));
    const quizzes = await quizzManager.getQuizzByIds(ids);
    res.json(quizzes.filter((q: any) => q.creator === userId || q.private === false));
  })
);

routes.get(
  "/available-quizz",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await quizzManager.getAvailableQuizz(getIdFromReq(req)));
  })
);

routes.get(
  "/public-quizz",
  asyncHandler(async (_req, res) => {
    res.json(await quizzManager.getPublicQuizz());
  })
);

// Cette route n'avait pas de verifyToken alors qu'elle lisait req.user.id :
// elle levait une TypeError et laissait la requête pendante côté client.
routes.post(
  "/create",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const data = { ...req.body, creator: getIdFromReq(req) };
    const retour = await quizzManager.createQuizz(data);
    if (!retour?.success || !retour.quizz_id) {
      throw new HttpError(400, "La création du quizz a échoué.");
    }
    // Seul le mode LIST envoie une questionList : les autres modes (GRID,
    // PICKANDBAN...) plantaient ici sur .map(undefined), rattrapé en silence
    // mais logué à chaque création.
    if (data.questionList) {
      await questionManager.addQuizzToQuestion(data.questionList, retour.quizz_id);
    }
    await userManager.addQuizzToUser(Number(retour.creator), Number(retour.quizz_id));
    res.status(201).json(retour);
  })
);

routes.put(
  "/update",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    await ownsQuizz(userId, Number(req.body?.quizz_id));
    res.json(await quizzManager.updateQuizz({ ...req.body, creator: userId }));
  })
);

routes.delete(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const quizz_id = Number(req.body?.quizz_id);
    await ownsQuizz(userId, quizz_id);
    const retour = await quizzManager.deleteQuizz(quizz_id);
    if (retour.success) {
      await userManager.deleteQuizzFromUser(userId, quizz_id);
    }
    res.json(retour);
  })
);

export default routes;
