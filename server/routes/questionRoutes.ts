import { Router } from "express";
import questionManager from "../function/questionManager";
import token from '../utils/jwt';
import userManager from '../function/userManager';
import getIdFromReq from '../utils/getIdFromReq';

const checkCreator = async (req:any, question_id:number) => {
    let newReq : any= req;
    const user = newReq.user;
    const creator = await questionManager.getCreatorOfQuestion(question_id);
    return user.id === creator;
}

const routes = Router();

routes.get("/", token.verifyToken,async (req,res) => {
    console.log("appelle aux questions");
    const id = getIdFromReq(req);
    console.log(id)
    try {
        const retour =await questionManager.getQuestionByCreator(id);
        res.json(retour);

    } catch (error) {
        console.error(error);
    }
});

routes.get("/available-questions",token.verifyToken, async (req,res) => {
    console.log("appelle aux questions mais dans le router");
    const id = getIdFromReq(req);
    try {
        const retour = await questionManager.getAvailableQuestions(id);
        res.json(retour);
        
    } catch (error) {
        console.error(error);
    }
});

routes.get("/public-questions", async (req,res) => {
    console.log("appelle aux questions publiques");
    let retour;
    try {
      retour = await questionManager.getPublicQuestions();
    } catch (error) {
      console.error(error);
    }
    res.json(retour);
});

routes.post("/create", token.verifyToken, async (req,res) => {
    console.log("création de question via les requête http");
    const data : any = req.body;
    data.creator = getIdFromReq(req);
    let retour = {success :false, creator : data.creator, question_id : 0}
    if (data && data.mode){
        switch (data.mode){
            case "QCM":
                retour = await questionManager.createQCMQuestion(data);
                break;
            case "FREE":
                retour = await questionManager.createFreeQuestion(data);
                break;
            case "VF": 
                retour = await questionManager.createVFQuestion(data);
                break;
            case "DCC":
                retour = await questionManager.createDCCQuestion(data);
                break;
            default :
                return;
        }
        console.log("après le switchcase");
        await userManager.addQuestionToUser(Number(retour?.creator), Number(retour?.question_id));
    }
    res.json(retour);
});

routes.put("/update",token.verifyToken, async (req,res) => {
    console.log("modification de question via les requête http");
    const {question_id, data} : any = req.body;
    data.creator = getIdFromReq(req);
    let retour = {success :false}
    if(await checkCreator(req, question_id)){  
        switch (data.mode){
            case "QCM":
                retour = await questionManager.updateQCMQuestion(req.body);
                break;
            case "FREE":
                retour = await questionManager.updateFreeQuestion(req.body);
                break;
            case "VF": 
                retour = await questionManager.updateVFQuestion(req.body);
                break;
            case "DCC":
                retour = await questionManager.updateDCCQuestion(req.body);
                break;
            default :
                return;
        }
    }
    console.log(retour);
    res.json(retour);
});

routes.delete("/",token.verifyToken, async (req,res)=>{
    console.log("api suprresion de question");
    const data : any = req.query;
    const creator = await questionManager.getCreatorOfQuestion(data.question_id);
    let retour = {success :false}
    if(await checkCreator(req, data.question_id)){
        retour = await questionManager.deleteQuestion(data.question_id);
        if (retour.success){
            await userManager.deleteQuestionFromUser(Number(creator), Number(data.question_id))
        }
    }
    res.json(retour);
})


export default routes;