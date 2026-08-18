import { get } from "mongoose";
import { ThemeModel } from "../Collection/theme";
import logger from "../utils/logger";
import { isThemeEffectivelyPublic, getThemeBlockingCount } from "./publicationStatus";

const create = async (data : any) =>{
    logger.debug("tentative de création de theme avec la data : ", data);
    try {
        const newTheme = await ThemeModel.create({
            imgOrString: data.imgOrString || false,
            img: data.img,
            title: data.title,
            creator: data.creator,
            private: data.private,
            questions: data.questions || [],
            tags: data.tags || [],
            folder: data.folder || undefined,
        });
        return ({success : true, theme:newTheme})
    } catch (error) {
        return ({success : false});
    }
}

const update = async (data : any) =>{
    try {
        await ThemeModel.updateOne({theme_id: data.theme_id}, {
            imgOrString: data.imgOrString,
            img: data.img,
            title: data.title,
            private: data.private,
            questions: data.questions || [],
            tags: data.tags || [],
            folder: data.folder || undefined,
        });
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const deleteTheme = async (theme_id : number) =>{
    try {
        await ThemeModel.deleteOne({theme_id: theme_id});
        
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const getThemeById = async (theme_id : number) =>{
    try {
        return await ThemeModel.findOne({theme_id: theme_id});    
    } catch (error) {
        return null;
    }
}

const getThemeByCreator = async (creator_id : number, min : number, folder?: string) =>{
    try {
        const filter: Record<string, unknown> = {
            creator: creator_id,
            $expr: {
                $gte: [{ $size: "$questions" }, min]
            }
        };
        if (folder === "none") {
            filter.folder = { $exists: false };
        } else if (folder) {
            filter.folder = folder;
        }
        const themes = await ThemeModel.find(filter);
        return themes;
    } catch (error) {
        return [];
    }
}

const getPublicThemes = async (min : number) => {
    try {
        const candidates = await ThemeModel.find({
            private: false,
            $expr: {
                $gte: [{ $size: "$questions" }, min]
            }
        });
        const flags = await Promise.all(candidates.map((t) => isThemeEffectivelyPublic(t)));
        return candidates.filter((_, i) => flags[i]);
    } catch (error) {
        return [];
    }
}

/** Réservé à l'écran d'édition du créateur : pourquoi son thème "public" ne l'est pas encore vraiment. */
const getPublicationStatus = async (theme_id: number) => {
    const theme = await ThemeModel.findOne().where("theme_id").equals(theme_id);
    if (!theme) return { effectivePublic: false, blockedCount: 0 };
    return {
        effectivePublic: await isThemeEffectivelyPublic(theme),
        blockedCount: await getThemeBlockingCount(theme),
    };
};

const getAvailableThemes = async (id: number, min : number) => {
    try {
        let retour;
        const CreatorThemes = await getThemeByCreator(id, min);
        const PublicThemes = await getPublicThemes(min);

        const existingThemeIds = new Set(
            PublicThemes.map((t: any) => t.theme_id)
        );

        const filteredCreatorThemes = CreatorThemes.filter(
            (t: any) => !existingThemeIds.has(t.theme_id)
        );
        
        return [...PublicThemes, ...filteredCreatorThemes];
    } catch (error) {
        console.error("erreur lors de la récupération des thèmes disponibles", error);
        return [];
    }
};

/** Chargement en lot (ex: résoudre un thème ouvert directement par son id, sans état de navigation). */
const getThemesByIds = async (ids: number[]) => {
    if (ids.length === 0) return [];
    try {
        return await ThemeModel.find({ theme_id: { $in: ids } });
    } catch (error) {
        console.error("erreur lors de la récupération des thèmes par ids", error);
        return [];
    }
};

const getCreatorOfTheme = async (id: number) => {
    try {
        const retour = await ThemeModel.findOne().where('theme_id').equals(id);
        return retour?.creator;
    } catch (error) {
        console.error("erreur lors de la récupération du créateur", error);
        return undefined;
    }
}

export default{
    create,
    update,
    deleteTheme,
    getThemeById,
    getThemesByIds,
    getThemeByCreator,
    getCreatorOfTheme,
    getPublicThemes,
    getAvailableThemes,
    getPublicationStatus,
}