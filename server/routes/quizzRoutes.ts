import { Router } from "express";
import getter from "../function/getter";
import quizzCRUD from "../function/quizzCRUD";
import token from '../utils/jwt';
import questionCRUD from "../function/questionCRUD";
import userCRUD from "../function/accountCRUD";

const routes = Router();

routes.get("/",token.verifyToken, async (req,res) => {
    console.log("appelle au quizz");
    const newReq : any= req;
    const id = Number(newReq.user.id);
    try {
      const retour =await getter.getQuizzByOwner(id);
      res.json(retour);
      
    } catch (error) {
      console.error(error);
    }
});

routes.post("/create", async (req,res) => {
    console.log("création de question via les requête http");
    const data : any = req.body;
    
    const retour = await quizzCRUD.createQuizz(data);
    await questionCRUD.addQuizzToQuestion(data.questionList, retour?.quizz_id);
    await userCRUD.addQuizzToUser(Number(retour?.creator), Number(retour?.quizz_id));
    res.json(retour);
});

routes.put("/update",token.verifyToken, async (req,res) => {
    console.log("modification de quizz via les requête http");
    const data : any = req.body;
    console.log(data);
    let newReq : any= req;
    const owner = await getter.getOwnerOfQuizz(Number(data.quizz_id));
    let retour = {success :false}
    console.log(owner, newReq.user.id,newReq.user.id === owner);
    if(newReq.user.id === owner){  
      console.log("là ça va update le quizz normalement");
      retour = await quizzCRUD.updateQuizz(req.body);
    }
    console.log(retour);
    res.json(retour);
});
  
  
  


routes.delete("/", token.verifyToken,async (req,res)=>{
    console.log("api suprresion de quizz");
    const newReq : any = req;
    const data : any = req.body;
    console.log(data);
    let retour = {success : false};
    if (data.creator === newReq.user.id){
      console.log("là ça va supprimer");
      retour = await quizzCRUD.deleteQuizz(data.quizz_id);
      await userCRUD.deleteQuizzFromUser(Number(data.creator), Number(data.quizz_id));
    }
    res.json(retour);
});

export default routes;