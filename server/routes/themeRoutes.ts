import { Router } from "express";
import themeManager from "../function/themeManager";
import userManager from "../function/userManager";
import token from "../utils/jwt";
import getIdFromReq from "../utils/getIdFromReq";
import asyncHandler from "../utils/asyncHandler";
import assertOwner from "../utils/assertOwner";
import { HttpError } from "../utils/errorHandler";

const routes = Router();

const ownsTheme = (userId: number, theme_id: number) =>
  assertOwner(userId, theme_id, themeManager.getCreatorOfTheme, "thème");

const minFromQuery = (raw: unknown) => (raw ? Number(raw) : 0);

routes.get(
  "/",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const folder = req.query.folder ? String(req.query.folder) : undefined;
    res.json(await themeManager.getThemeByCreator(getIdFromReq(req), 0, folder));
  })
);

// Résout par lot des thèmes déjà connus par id (ouverture directe d'un
// lien d'édition, sans état de navigation) — ne renvoie que ceux que
// l'utilisateur a le droit de voir (les siens ou publics).
routes.get(
  "/by-ids",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));
    const themes = await themeManager.getThemesByIds(ids);
    res.json(themes.filter((t: any) => t.creator === userId || t.private === false));
  })
);

routes.get(
  "/available-themes",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await themeManager.getAvailableThemes(getIdFromReq(req), minFromQuery(req.query.min)));
  })
);

routes.get(
  "/public-themes",
  asyncHandler(async (req, res) => {
    res.json(await themeManager.getPublicThemes(minFromQuery(req.query.min)));
  })
);

routes.post(
  "/create",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const creator = getIdFromReq(req);
    const { success, theme } = await themeManager.create({ ...req.body, creator });
    if (!success || !theme?.theme_id) {
      throw new HttpError(400, "La création du thème a échoué.");
    }
    await userManager.addThemeToUser(creator, theme.theme_id);
    res.status(201).json({ success: true, theme_id: theme.theme_id });
  })
);

routes.put(
  "/update",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const theme_id = Number(req.body?.theme_id);
    await ownsTheme(userId, theme_id);
    res.json(await themeManager.update({ ...req.body, creator: userId }));
  })
);

routes.delete(
  "/delete",
  token.verifyToken,
  asyncHandler(async (req, res) => {
    const userId = getIdFromReq(req);
    const theme_id = Number(req.body?.theme_id);
    await ownsTheme(userId, theme_id);
    const result = await themeManager.deleteTheme(theme_id);
    if (result.success) {
      await userManager.deleteThemeFromUser(userId, theme_id);
    }
    res.json(result);
  })
);

export default routes;
