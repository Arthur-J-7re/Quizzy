import { Router } from "express";
import userManager from "../function/userManager";
const routes = Router();

routes.put("/updateUsername", async(req, res) => {
    console.log("modification d'un username via l'api");
    const data = req.body;
    const retour = await userManager.updateUsername(data.user_id, data.username);
    res.json(retour)
});

export default routes;