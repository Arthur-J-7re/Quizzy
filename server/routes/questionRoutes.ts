import { Router } from "express";
import getter from "../function/getter"
import questionCRUD from "../function/questionCRUD";
import token from '../utils/jwt';
import userCRUD from '../function/accountCRUD';

const routes = Router();

routes.get("/", token.verifyToken,async (req,res) => {
    console.log("appelle aux questions");
    let newReq : any = req;
    const id = Number(newReq.user.id);
    try {
        const retour =await getter.getQuestionByOwner(id);
        res.json(retour);

    } catch (error) {
        console.error(error);
    }
});

routes.get("/questionsAvailable",token.verifyToken, async (req,res) => {
    console.log("appelle aux questions mais dans le router");
    let newReq : any = req;
    const id = Number(newReq.user.id);
    try {
        const retour = await getter.getQuestionAvailable(id);
        res.json(retour);
        
    } catch (error) {
        console.error(error);
    }
});

routes.post("/create", token.verifyToken, async (req,res) => {
    console.log("création de question via les requête http");
    const data : any = req.body;
    console.log("data c'est ça : ", data);
    let newReq : any= req;
    const owner = data.user_id;
    let retour = {success :false, creator : 0, question_id : 0}
    console.log(newReq.user);
    console.log(newReq.user.id);
    console.log(owner);
    if(newReq.user.id === owner){
        switch (data.mode){
            case "QCM":
                retour = await questionCRUD.createQCMQuestion(data);
                break;
            case "FREE":
                retour = await questionCRUD.createFreeQuestion(data);
                break;
            case "VF": 
                retour = await questionCRUD.createVFQuestion(data);
                break;
            case "DCC":
                retour = await questionCRUD.createDCCQuestion(data);
                break;
            default :
                return;
        }
        console.log("après le switchcase");
        await userCRUD.addQuestionToUser(Number(retour?.creator), Number(retour?.question_id));
    }
    res.json(retour);
});

routes.put("/update",token.verifyToken, async (req,res) => {
    console.log("modification de question via les requête http");
    const {question_id, data} : any = req.body;
    let newReq : any= req;
    const owner = await getter.getOwnerOfQuestion(question_id);
    let retour = {success :false}
    console.log(newReq.user.id === owner);
    if(newReq.user.id === owner){  
        switch (data.mode){
            case "QCM":
                retour = await questionCRUD.updateQCMQuestion(req.body);
                break;
            case "FREE":
                retour = await questionCRUD.updateFreeQuestion(req.body);
                break;
            case "VF": 
                retour = await questionCRUD.updateVFQuestion(req.body);
                break;
            case "DCC":
                retour = await questionCRUD.updateDCCQuestion(req.body);
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
    let newReq : any= req;
    const owner = await getter.getOwnerOfQuestion(data.question_id);
    let retour = {success :false}
    if(newReq.user.id === owner){
        retour = await questionCRUD.deleteQuestion(data.question_id);
        if (retour.success){
            await userCRUD.deleteQuestionFromUser(Number(owner), Number(data.question_id))
        }
    }
    res.json(retour);
})


export default routes;