import { Router } from "express";
import AccountCRUD from "../function/accountCRUD";
const routes = Router();

routes.put("/updateUsername", async(req, res) => {
    const data = req.query;
    const retour = await AccountCRUD.updateUsername(data.id || "", data.username);
    res.json(retour)
});

export default routes;