import { Router } from "express";
import themeManager from "../function/themeManager";
import userManager from '../function/userManager';
import token from '../utils/jwt';
import getIdFromReq from '../utils/getIdFromReq';
import { get } from "mongoose";

const checkCreator = async (req:any, theme_id:number) => {
    let newReq : any= req;
    const user = newReq.user;
    const creator = await themeManager.getCreatorOfTheme(theme_id);
    return user.id === creator;
}

const routes = Router();

routes.get("/", token.verifyToken,async (req,res) => {
    console.log("appelle aux themes");
    let newReq : any = req;
    const user = newReq.user;
    const id = Number(user.id);
    try {
        const retour =await themeManager.getThemeByCreator(id,0);
        res.json(retour);
    } catch (error) {
        console.error(error);
    }
});

routes.get("/available-themes",token.verifyToken, async (req,res) => {
    console.log("appelle aux themes mais dans le router");
    const id = getIdFromReq(req);
    const min = req.query.min ? Number(req.query.min) : 0;
    try {
        const retour = await themeManager.getAvailableThemes(id, min);
        res.json(retour);
    } catch (error) {
        console.error(error);
    }
});

routes.get("/public-themes", async (req,res) => {
    console.log("appelle aux thèmes publics");
    let retour;
    const min = req.query.min ? Number(req.query.min) : 0;
    try {
        retour = await themeManager.getPublicThemes(min);
    } catch (error) {
        console.error(error);
    }
    res.json(retour);
});

routes.post("/create", token.verifyToken, async (req,res) => {
    console.log("création de thème via les requête http");
    const data : any = req.body;
    data.creator = getIdFromReq(req);
    console.log("data c'est ça : ", data);
    let retour = {success :false}
    try {
        const {success, theme} = await themeManager.create(data);
        if (success && theme && theme.theme_id) await userManager.addThemeToUser(data.creator, theme.theme_id);
        success ? retour.success = true : null;  
    } catch (error) {
        console.error(error);
    }
    res.json(retour);
});

routes.put("/update",token.verifyToken, async (req,res) => {
    console.log("modification de thème via les requête http");
    const data : any = req.body;
    data.creator = getIdFromReq(req);
    const {theme_id} = data;
    let retour = {success :false}
    try {
        if (await checkCreator(req, theme_id)) {
            const result = await themeManager.update(data);
            if (result.success) {
                retour.success = true;
            }
        }
    } catch (error) {
        console.error(error);
    }
    res.json(retour);
});

routes.delete("/delete",token.verifyToken, async (req,res) => {
    console.log("suppression de thème via les requête http");
    const body : any = req.body;
    const {theme_id} = body;
    const id = getIdFromReq(req);
    let retour = {success :false}
    try {
        if (await checkCreator(req, theme_id)) {
            const result = await themeManager.deleteTheme(theme_id);
            if (result.success) {
                await userManager.deleteThemeFromUser(id, theme_id);
                retour.success = true;
            }
        }
    } catch (error) {
        console.error(error);
    }
    res.json(retour);
});

export default routes;
