import { Router } from "express";
import userRoutes from "./userRoutes";
import quizzRoutes from "./quizzRoutes";
import questionRoutes from "./questionRoutes";
import accountCRUD from "../function/accountCRUD";

const routes = Router();

routes.use("/user", userRoutes);
routes.use("/quizz", quizzRoutes);
routes.use("/question", questionRoutes);
routes.post("/login",async(req, res) => {
    const retour = await accountCRUD.login(req.body.loginData);
    res.json(retour);
});
routes.post("/register",async(req, res) => {
    const retour = await accountCRUD.register(req.body.signupData);
    res.json(retour);
})

export default routes;