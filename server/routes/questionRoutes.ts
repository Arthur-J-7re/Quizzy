import { Router } from "express";
import getter from "../function/getter"
import questionCRUD from "../function/questionCRUD";

const routes = Router();

routes.get("/", async (req,res) => {
    console.log("appelle aux questions");
    const id = Number(req.query.id);
    try {
        const retour =await getter.getQuestionByOwner(id);
        res.json(retour);

    } catch (error) {
        console.error(error);
    }
});

routes.get("/questionsAvailable", async (req,res) => {
    console.log("appelle aux questions mais dans le router");
    const id = Number(req.query.id);
    try {
        const retour = await getter.getQuestionAvailable(id);
        res.json(retour);
        
    } catch (error) {
        console.error(error);
    }
});

routes.post("/create", async (req,res) => {
    console.log("création de question via les requête http");
    const data : any = req.query.data;
    if (!data?.question) {
        return;
    }
    switch (data.question.mode){
        case "QCM":
            res.json(questionCRUD.createQCMQuestion(data));
        case "FREE":
            res.json(questionCRUD.createFreeQuestion(data));
        case "VF": 
             res.json(questionCRUD.createVFQuestion(data));
        case "DCC":
            res.json(questionCRUD.createDCCQuestion(data));
        default :
            return;
    }
});

routes.put("/modify", async (req,res) => {
    console.log("modification de question via les requête http");
    const data : any = req.query.data;
    if (!data?.question) {
        return;
    }
    switch (data.question.mode){
        case "QCM":
            res.json(questionCRUD.modifyQCMQuestion(data));
        case "FREE":
            res.json(questionCRUD.modifyFreeQuestion(data));
        case "VF": 
             res.json(questionCRUD.modifyVFQuestion(data));
        case "DCC":
            res.json(questionCRUD.modifyDCCQuestion(data));
        default :
            return;
    }
});


export default routes;