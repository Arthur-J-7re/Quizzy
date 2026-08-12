import { Router } from "express";
import userRoutes from "./userRoutes";
import quizzRoutes from "./quizzRoutes";
import questionRoutes from "./questionRoutes";
import themeRoutes from "./themeRoutes";
import folderRoutes from "./folderRoutes";
import emissionRoutes from "./emissionRoutes";
import tagRoutes from "./tagRoutes";
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
