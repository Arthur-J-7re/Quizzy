import { Router } from "express";
import getter from "../function/getter";
import QuizzCRUD from "../function/quizzCRUD";

const routes = Router();

routes.get("/", async (req,res) => {
    console.log("appelle au quizz");
    const id = Number(req.query.id);
    try {
      const retour =await getter.getQuizzByOwner(id);
      res.json(retour);
      
    } catch (error) {
      console.error(error);
    }
});
  
  
  
routes.delete("/", async (req, res) => {
    const data = req.query;
    const retour = await QuizzCRUD.deleteQuizz(String(data.quizz_id));
    res.json(retour);
})

export default routes;