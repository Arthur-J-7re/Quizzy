import { Router } from "express";
import userRoutes from "./userRoutes";
import quizzRoutes from "./quizzRoutes";
import questionRoutes from "./questionRoutes";
import themeRoutes from "./themeRoutes";
import folderRoutes from "./folderRoutes";
import emissionRoutes from "./emissionRoutes";
import tagRoutes from "./tagRoutes";
import adminRoutes from "./adminRoutes";
import adminQuestionRoutes from "./adminQuestionRoutes";
import notificationRoutes from "./notificationRoutes";
import friendRoutes from "./friendRoutes";
import messageRoutes from "./messageRoutes";
import userManager from "../function/userManager";
import asyncHandler from "../utils/asyncHandler";
import { loginSchema, registerSchema } from "../validation/userSchemas";

const routes = Router();

routes.use("/user", userRoutes);
routes.use("/quizz", quizzRoutes);
routes.use("/question", questionRoutes);
routes.use("/theme", themeRoutes);
routes.use("/folder", folderRoutes);
routes.use("/emission", emissionRoutes);
routes.use("/tag", tagRoutes);
routes.use("/notification", notificationRoutes);
routes.use("/friend", friendRoutes);
routes.use("/message", messageRoutes);
// Préfixe le plus spécifique en premier : sinon adminRoutes ("/admin", avec
// son middleware requireRole(["superadmin"]) posé en `.use()` sans chemin)
// intercepte aussi "/admin/questions/*" avant qu'Express n'ait la chance de
// tester adminQuestionRoutes.
routes.use("/admin/questions", adminQuestionRoutes);
routes.use("/admin", adminRoutes);

routes.post(
  "/login",
  asyncHandler(async (req, res) => {
    const loginData = loginSchema.parse(req.body?.loginData);
    const retour = await userManager.login(loginData);
    res.status(retour.success ? 200 : 401).json(retour);
  })
);

routes.post(
  "/register",
  asyncHandler(async (req, res) => {
    const signupData = registerSchema.parse(req.body?.signupData);
    const retour = await userManager.register(signupData);
    res.status(retour.success ? 201 : 409).json(retour);
  })
);

export default routes;
