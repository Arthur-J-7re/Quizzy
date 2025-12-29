import { Router } from "express";
import emissionManager from "../function/emissionManager";
import userManager from '../function/userManager';
import token from '../utils/jwt';
import getIdFromReq from '../utils/getIdFromReq';

const checkCreator = async (req:any, emission_id:number) => {
    let newReq : any= req;
    const user = newReq.user;
    const creator = await emissionManager.getCreatorOfEmission(emission_id);
    return user.id === creator;
}

const routes = Router();

routes.get("/", token.verifyToken,async (req,res) => {
    console.log("appelle aux questions");
    const id = getIdFromReq(req);
    try {
        const retour =await emissionManager.getEmissionByCreator(id);
        res.json(retour);

    } catch (error) {
        console.error(error);
    }
}); 

routes.get("/available-emissions",token.verifyToken, async (req,res) => {
    console.log("appelle aux questions mais dans le router");
    const id = getIdFromReq(req);
    try {
        const retour = await emissionManager.getAvailableEmissions(id);
        res.json(retour);
        
    } catch (error) {
        console.error(error);
    }
});

routes.get("/public-emissions", async (req,res) => {
    console.log("appelle aux émissions publiques");
    let retour;
    try {
        retour = await emissionManager.getPublicEmissions();
    } catch (error) {
        console.error(error);
    }
    res.json(retour);
});

routes.post("/create", token.verifyToken, async (req,res) => {
    console.log("création d'émission via les requête http");
    const data : any = req.body;
    data.creator = getIdFromReq(req);
    console.log("data c'est ça : ", data);
    let retour = {success :false}
    try {
        const emission = await emissionManager.create(data);
        console.log("emission créée : ", emission);
        emission.success ? await userManager.addEmissionToUser(data.creator, emission.emission_id || 0) : null;
        emission.success ? retour.success = true : null;  
    } catch (error) {
        console.error(error);
    }
    res.json(retour);
});

routes.put("/update",token.verifyToken, async (req,res) => {
    console.log("modification d'emission via les requête http");
    const {emission_id, data} : any = req.body;
    let retour = {success :false}
    if(await checkCreator(req, emission_id)){  
        retour = await emissionManager.update(data);
    }
    console.log(retour);
    res.json(retour);
});

routes.delete("/",token.verifyToken, async (req,res)=>{
    console.log("api suprresion d'emission");
    const data : any = req.query;
    const creator = await emissionManager.getCreatorOfEmission(data.emission_id);
    let retour = {success :false}
    if(await checkCreator(req, data.emission_id)){
        retour = await emissionManager.deleteEmission(data.emission_id);
        if (retour.success){
            await userManager.deleteEmissionFromUser(Number(creator), Number(data.emission_id))
        }
    }
    res.json(retour);
})


export default routes;