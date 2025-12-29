import { Router } from "express";
import userRoutes from "./userRoutes";
import quizzRoutes from "./quizzRoutes";
import questionRoutes from "./questionRoutes";
import themeRoutes from "./themeRoutes";
import emissionRoutes from "./emissionRoutes";
import userManager from "../function/userManager";

const routes = Router();

routes.use("/user", userRoutes);
routes.use("/quizz", quizzRoutes);
routes.use("/question", questionRoutes);
routes.use("/theme", themeRoutes);
routes.use("/emission", emissionRoutes);
routes.post("/login",async(req, res) => {
    const retour = await userManager.login(req.body.loginData);
    res.json(retour);
});
routes.post("/register",async(req, res) => {
    console.log("tentative de création de compte");
    const retour = await userManager.register(req.body.signupData);
    res.json(retour);
})

export default routes;