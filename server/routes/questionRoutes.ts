import { Router } from "express";
import questionManager from "../function/questionManager";
import userManager from "../function/userManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import assertOwner from "../utils/assertOwner";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

const ownsQuestion = (userId: number, question_id: number) =>
  assertOwner(userId, question_id, questionManager.getCreatorOfQuestion, "question");

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await questionManager.getQuestionByCreator(getIdFromReq(req)));
  })
);

routes.get(
  "/available-questions",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await questionManager.getAvailableQuestions(getIdFromReq(req)));
  })
);

routes.get(
  "/public-questions",
  asyncHandler(async (_req, res) => {
    res.json(await questionManager.getPublicQuestions());
  })
);

const parseFolderIdParam = (raw: unknown): number | "none" | undefined => {
  if (raw === "none") return "none";
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

routes.get(
  "/search",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const scopeRaw = String(req.query.scope ?? "all");
    const scope = scopeRaw === "mine" || scopeRaw === "public" ? scopeRaw : "all";
    const tags = typeof req.query.tags === "string" && req.query.tags.length > 0
      ? req.query.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    res.json(await questionManager.getFilteredQuestions(userId, {
      scope,
      folder_id: parseFolderIdParam(req.query.folder_id),
      tags,
      mode: req.query.mode ? String(req.query.mode) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }));
  })
);

// Résout par lot les questions déjà sélectionnées mais absentes de la page
// filtrée courante (cf. cache client du picker de questions) — ne renvoie
// que celles que l'utilisateur a le droit de voir (les siennes ou publiques).
routes.get(
  "/by-ids",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));
    const questions = await questionManager.getQuestionsByIds(ids);
    res.json(questions.filter((q: any) => q.creator === userId || q.private === false));
  })
);

routes.post(
  "/create",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const data = { ...req.body, creator: getIdFromReq(req) };

    const create = {
      QCM: questionManager.createQCMQuestion,
      FREE: questionManager.createFreeQuestion,
      VF: questionManager.createVFQuestion,
      DCC: questionManager.createDCCQuestion,
    }[data.mode as string];

    if (!create) {
      throw new HttpError(400, "Mode de question inconnu.");
    }

    const retour = await create(data);
    if (!retour?.success) {
      throw new HttpError(400, "La création de la question a échoué.");
    }
    await userManager.addQuestionToUser(Number(retour.creator), Number(retour.question_id));
    res.status(201).json(retour);
  })
);

routes.put(
  "/update",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const { question_id, data } = req.body ?? {};
    await ownsQuestion(userId, Number(question_id));

    const update = {
      QCM: questionManager.updateQCMQuestion,
      FREE: questionManager.updateFreeQuestion,
      VF: questionManager.updateVFQuestion,
      DCC: questionManager.updateDCCQuestion,
    }[data?.mode as string];

    if (!update) {
      throw new HttpError(400, "Mode de question inconnu.");
    }
    res.json(await update({ ...req.body, data: { ...data, creator: userId } }));
  })
);

routes.delete(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const question_id = Number(req.query.question_id);
    await ownsQuestion(userId, question_id);
    const retour = await questionManager.deleteQuestion(question_id);
    if (retour.success) {
      await userManager.deleteQuestionFromUser(userId, question_id);
    }
    res.json(retour);
  })
);

export default routes;
