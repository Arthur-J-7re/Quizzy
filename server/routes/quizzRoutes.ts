import { Router } from "express";
import quizzManager from "../function/quizzManager";
import token from '../utils/jwt';
import questionManager from "../function/questionManager";
import userManager from "../function/userManager";
import getIdFromReq from '../utils/getIdFromReq';

const checkCreator = async (req:any, quizz_id:number) => {
    let newReq : any= req;
    const user = newReq.user;
    const creator = await quizzManager.getCreatorOfQuizz(quizz_id);
    return user.id === creator;
}

const routes = Router();

routes.get("/",token.verifyToken, async (req,res) => {
    console.log("appelle au quizz");
    const id = getIdFromReq(req);
    try {
      const retour =await quizzManager.getQuizzByCreator(id);
      res.json(retour);
      
    } catch (error) {
      console.error(error);
    }
});

routes.get("/available-quizz",token.verifyToken, async (req,res) => {
    console.log("appelle aux quizz available");
    const id = getIdFromReq(req);
    let retour = null;
    try {
        retour = await quizzManager.getAvailableQuizz(Number(id));
    } catch (error) {
      console.error(error);
    }
    res.json(retour);
});

routes.get("/public-quizz", async (req,res) => {
    console.log("appelle aux quizz public");
    let retour;
    try {
      retour = await quizzManager.getPublicQuizz();
    } catch (error) {
      console.error(error);
    }
    res.json(retour);
});

routes.post("/create", async (req,res) => {
    console.log("création de question via les requête http");
    const data : any = req.body;
    data.creator = getIdFromReq(req);
    const retour = await quizzManager.createQuizz(data);
    await questionManager.addQuizzToQuestion(data.questionList, retour?.quizz_id);
    await userManager.addQuizzToUser(Number(retour?.creator), Number(retour?.quizz_id));
    res.json(retour);
});

routes.put("/update",token.verifyToken, async (req,res) => {
    console.log("modification de quizz via les requête http");
    const data : any = req.body;
    data.creator = getIdFromReq(req);
    let retour = {success :false}
    if(await checkCreator(req, Number(data.quizz_id))){  
      console.log("là ça va update le quizz normalement");
      retour = await quizzManager.updateQuizz(req.body);
    }
    console.log(retour);
    res.json(retour);
});
  
routes.delete("/", token.verifyToken,async (req,res)=>{
    console.log("api suprresion de quizz");
    const newReq : any = req;
    const user = newReq.user;
    const data : any = req.body;
    let retour = {success : false};
    if (!(data && data.quizz_id)){
      res.json(retour);
    }
    try{
      console.log(data);
      const creator = await quizzManager.getCreatorOfQuizz(data.quizz_id);
      if (creator === user.id){
        console.log("là ça va supprimer");
        retour = await quizzManager.deleteQuizz(data.quizz_id);
        await userManager.deleteQuizzFromUser(Number(creator), Number(data.quizz_id));
      }
    } catch (error){
      console.error("erreur lors de la suppression d'un quizz : ", error);
    }
    res.json(retour);
});

export default routes;