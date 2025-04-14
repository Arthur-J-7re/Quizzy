import { Router } from "express";
import AccountCRUD from "../function/accountCRUD";
const routes = Router();

routes.put("/updateUsername", async(req, res) => {
    console.log("modification d'un username via l'api");
    const data = req.body;
    const retour = await AccountCRUD.updateUsername(data.user_id, data.username);
    res.json(retour)
});

export default routes;