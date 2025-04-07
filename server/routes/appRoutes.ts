import { Router } from "express";
import userRoutes from "./userRoutes";
import quizzRoutes from "./quizzRoutes";
import questionRoutes from "./questionRoutes";

const routes = Router();

routes.use("/user", userRoutes);
routes.use("/quizz", quizzRoutes);
routes.use("/question", questionRoutes);

export default routes;